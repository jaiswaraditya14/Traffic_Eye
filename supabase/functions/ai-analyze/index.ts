/**
 * ai-analyze — authenticated server-side AI proxy for the Traffic Eye pipeline.
 *
 * Why this exists: provider keys previously shipped in EXPO_PUBLIC_* env vars,
 * which are inlined into the APK bundle and extractable from any installed
 * copy of the app. Keys now live only in Edge Function secrets.
 *
 * Contract (POST, JSON):
 *   { stage: "vision" | "ocr", imageBase64: string }
 *   { stage: "audit", evidenceSummary: string, candidates: string[] }
 *
 * Guarantees:
 *   - Caller is derived from the verified JWT. No caller-supplied user id.
 *   - The client cannot choose the prompt, the provider, the model, or the
 *     endpoint. Only `stage`.
 *   - Per-user quota is counted server-side from ai_analysis_events.
 *   - Responses carry a correlation id and never include provider payloads,
 *     upstream error bodies, prompts, or key material.
 *   - Every attempt is recorded as a server-owned ai_analysis_events row.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2.94.0';
import { ERR, jsonErr, jsonOk, logEvent, newCorrelationId, preflight } from '../_shared/http.ts';
import { PLATE_OCR_PROMPT, VISION_PROMPT, auditPrompt } from './prompts.ts';
import { ProviderError, providerConfiguredFor, runStage } from './providers.ts';

/** Decoded image ceiling for an AI request. Vision input is a resized JPEG. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 8_000;
const MAX_CANDIDATES = 24;

// Includes base64 expansion and JSON overhead; enforced while streaming, even
// when Content-Length is absent or forged. Limits provider-facing input to 8 MiB.
const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 16_384;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function decodedByteLength(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/** JPEG magic bytes. Preprocessing always emits JPEG; anything else is rejected. */
function looksLikeJpeg(b64: string): boolean {
  return b64.startsWith('/9j/');
}

async function analyzeRequest(req: Request, correlationId: string): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'misconfigured' });
    return jsonErr(ERR.NOT_CONFIGURED, correlationId);
  }

  // ── Identity: verified JWT only ──────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return jsonErr(ERR.UNAUTHENTICATED, correlationId);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user || user.is_anonymous) return jsonErr(ERR.UNAUTHENTICATED, correlationId);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Body validation ──────────────────────────────────────────────────────
  if (req.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return jsonErr(ERR.UNSUPPORTED_MEDIA_TYPE, correlationId);
  }
  if (Number(req.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    return jsonErr(ERR.PAYLOAD_TOO_LARGE, correlationId);
  }
  let raw: unknown;
  try {
    const reader = req.body?.getReader();
    if (!reader) return jsonErr(ERR.BAD_REQUEST, correlationId);
    const decoder = new TextDecoder();
    let bytesRead = 0;
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel();
        return jsonErr(ERR.PAYLOAD_TOO_LARGE, correlationId);
      }
      text += decoder.decode(value, { stream: true });
    }
    raw = JSON.parse(text + decoder.decode());
  } catch {
    return jsonErr(ERR.BAD_REQUEST, correlationId, 'malformed json');
  }
  if (typeof raw !== 'object' || raw === null) return jsonErr(ERR.BAD_REQUEST, correlationId);

  const bodyObj = raw as Record<string, unknown>;
  const stage = bodyObj.stage;
  if (stage !== 'vision' && stage !== 'ocr' && stage !== 'audit') {
    return jsonErr(ERR.BAD_REQUEST, correlationId, 'unknown stage');
  }

  let prompt: string;
  let imageBase64: string | null = null;
  let jsonMode = false;

  if (stage === 'vision' || stage === 'ocr') {
    const img = bodyObj.imageBase64;
    if (typeof img !== 'string' || img.length === 0) {
      return jsonErr(ERR.BAD_REQUEST, correlationId, 'imageBase64 required');
    }
    if (img.length % 4 !== 0 || !BASE64_RE.test(img)) return jsonErr(ERR.BAD_REQUEST, correlationId, 'imageBase64 not base64');
    if (decodedByteLength(img) > MAX_IMAGE_BYTES) return jsonErr(ERR.PAYLOAD_TOO_LARGE, correlationId);
    if (!looksLikeJpeg(img)) return jsonErr(ERR.UNSUPPORTED_MEDIA_TYPE, correlationId, 'expected jpeg');
    imageBase64 = img;
    prompt = stage === 'vision' ? VISION_PROMPT : PLATE_OCR_PROMPT;
  } else {
    const summary = bodyObj.evidenceSummary;
    const candidates = bodyObj.candidates;
    if (typeof summary !== 'string' || summary.length === 0 || summary.length > MAX_TEXT_CHARS) {
      return jsonErr(ERR.BAD_REQUEST, correlationId, 'evidenceSummary invalid');
    }
    if (
      !Array.isArray(candidates) ||
      candidates.length > MAX_CANDIDATES ||
      !candidates.every((c) => typeof c === 'string' && c.length <= 64)
    ) {
      return jsonErr(ERR.BAD_REQUEST, correlationId, 'candidates invalid');
    }
    prompt = auditPrompt(summary, candidates as string[]);
    jsonMode = true;
  }

  if (!providerConfiguredFor(stage)) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'no_provider_keys', stage });
    return jsonErr(ERR.NOT_CONFIGURED, correlationId);
  }

  // The service-only RPC locks this user's quota and inserts a pending event
  // before any outbound call. Pending/failed requests count too. The caller id
  // always comes from the verified JWT, never the body or a quota parameter.
  const { data: reservation, error: reserveError } = await admin.rpc('reserve_ai_analysis_event', {
    p_user_id: user.id,
    p_stage: stage,
    p_correlation_id: correlationId,
    p_request_bytes: imageBase64 ? decodedByteLength(imageBase64) : new TextEncoder().encode(prompt).length,
  });
  if (!reserveError && reservation?.code === ERR.QUOTA_EXCEEDED) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'quota_exceeded', stage });
    return jsonErr(ERR.QUOTA_EXCEEDED, correlationId);
  }
  if (reserveError || typeof reservation?.eventId !== 'string') {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'quota_reservation_failed' });
    return jsonErr(ERR.INTERNAL, correlationId);
  }

  // ── Provider call ────────────────────────────────────────────────────────
  let result;
  let failure: ProviderError | null = null;
  try {
    result = await runStage(stage, prompt, imageBase64, jsonMode);
  } catch (err) {
    failure = err instanceof ProviderError ? err : new ProviderError(ERR.INTERNAL, null, 'stage failed');
  }

  const { data: recorded, error: recordError } = await admin.from('ai_analysis_events')
    .update({
      provider: result?.provider ?? null,
      model: result?.model ?? null,
      attempts: result?.attempts ?? failure?.attempts ?? 0,
      latency_ms: result?.latencyMs ?? failure?.latencyMs ?? 0,
      outcome: result ? 'success' : 'failure',
      failure_code: failure?.code ?? null,
    })
    .eq('id', reservation.eventId)
    .select('id')
    .single();
  if (recordError || !recorded) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'ledger_write_failed', stage });
    return jsonErr(ERR.INTERNAL, correlationId);
  }
  if (!result) {
    const code = failure?.code ?? ERR.INTERNAL;
    logEvent({ fn: 'ai-analyze', correlationId, event: 'failure', stage, code });
    return jsonErr(code, correlationId);
  }
  logEvent({ fn: 'ai-analyze', correlationId, event: 'success', stage,
    provider: result.provider, model: result.model, latencyMs: result.latencyMs, attempts: result.attempts });
  // Completion text is an advisory UI input. Trusted evidence/submission records
  // and server-side violation validation remain work for the later phases.
  return jsonOk({ stage, text: result.text, provider: result.provider,
    model: result.model, latencyMs: result.latencyMs }, correlationId);
}

export async function handleRequest(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  const correlationId = newCorrelationId();
  if (req.method !== 'POST') return jsonErr(ERR.METHOD_NOT_ALLOWED, correlationId);
  try {
    return await analyzeRequest(req, correlationId);
  } catch {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'internal_failure' });
    return jsonErr(ERR.INTERNAL, correlationId);
  }
}

Deno.serve(handleRequest);
