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

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ERR, jsonErr, jsonOk, logEvent, newCorrelationId, preflight } from '../_shared/http.ts';
import { PLATE_OCR_PROMPT, VISION_PROMPT, auditPrompt } from './prompts.ts';
import { ProviderError, anyProviderConfigured, runStage } from './providers.ts';

/** Decoded image ceiling for an AI request. Vision input is a resized JPEG. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 8_000;
const MAX_CANDIDATES = 24;

/** Rolling per-user quotas, enforced here (the client cannot pass these). */
const QUOTA_PER_HOUR = 40;
const QUOTA_PER_DAY = 200;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function decodedByteLength(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/** JPEG magic bytes. Preprocessing always emits JPEG; anything else is rejected. */
function looksLikeJpeg(b64: string): boolean {
  return b64.startsWith('/9j/');
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  const correlationId = newCorrelationId(req);

  if (req.method !== 'POST') return jsonErr(ERR.METHOD_NOT_ALLOWED, correlationId);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'misconfigured' });
    return jsonErr(ERR.NOT_CONFIGURED, correlationId);
  }
  if (!anyProviderConfigured()) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'no_provider_keys' });
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
  if (userErr || !user) return jsonErr(ERR.UNAUTHENTICATED, correlationId);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Body validation ──────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
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
    if (!BASE64_RE.test(img)) return jsonErr(ERR.BAD_REQUEST, correlationId, 'imageBase64 not base64');
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

  // ── Server-side quota ────────────────────────────────────────────────────
  const nowMs = Date.now();
  const hourAgo = new Date(nowMs - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: hourCount, error: hourErr }, { count: dayCount, error: dayErr }] = await Promise.all([
    admin
      .from('ai_analysis_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', hourAgo),
    admin
      .from('ai_analysis_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayAgo),
  ]);

  // Fail closed: if the quota ledger cannot be read, do not spend provider credit.
  if (hourErr || dayErr) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'quota_read_failed' });
    return jsonErr(ERR.INTERNAL, correlationId);
  }
  if ((hourCount ?? 0) >= QUOTA_PER_HOUR || (dayCount ?? 0) >= QUOTA_PER_DAY) {
    logEvent({ fn: 'ai-analyze', correlationId, event: 'quota_exceeded', stage, userHashed: user.id.slice(0, 8) });
    return jsonErr(ERR.QUOTA_EXCEEDED, correlationId);
  }

  // ── Provider call ────────────────────────────────────────────────────────
  try {
    const result = await runStage(stage, prompt, imageBase64, jsonMode);

    await admin.from('ai_analysis_events').insert({
      user_id: user.id,
      stage,
      provider: result.provider,
      model: result.model,
      correlation_id: correlationId,
      attempts: result.attempts,
      latency_ms: result.latencyMs,
      outcome: 'success',
      request_bytes: imageBase64 ? decodedByteLength(imageBase64) : prompt.length,
    });

    logEvent({
      fn: 'ai-analyze',
      correlationId,
      event: 'success',
      stage,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      attempts: result.attempts,
    });

    // `text` is the model completion. It is parsed and re-validated on the
    // client by the deterministic rule engine, which is the only thing that
    // may assert a violation.
    return jsonOk(
      { stage, text: result.text, provider: result.provider, model: result.model, latencyMs: result.latencyMs },
      correlationId,
    );
  } catch (err) {
    const pErr = err instanceof ProviderError ? err : null;
    const code = pErr?.code ?? ERR.INTERNAL;

    await admin.from('ai_analysis_events').insert({
      user_id: user.id,
      stage,
      provider: null,
      model: null,
      correlation_id: correlationId,
      attempts: 0,
      latency_ms: 0,
      outcome: 'failure',
      failure_code: code,
      request_bytes: imageBase64 ? decodedByteLength(imageBase64) : prompt.length,
    });

    logEvent({
      fn: 'ai-analyze',
      correlationId,
      event: 'failure',
      stage,
      code,
      upstreamStatus: pErr?.status ?? null,
    });

    return jsonErr(code, correlationId);
  }
});
