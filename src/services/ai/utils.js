/**
 * ai/utils.js — Client transport to the server-side AI proxy
 *
 * ── Security boundary ───────────────────────────────────────────────────────
 * The mobile client holds NO provider credentials and calls NO provider
 * endpoint. Every AI request goes through the authenticated Supabase Edge
 * Function `ai-analyze`, which owns the prompts, the model allow-list, the
 * timeouts, the key rotation, and the per-user quota.
 *
 * The client chooses only a pipeline stage: 'vision' | 'ocr' | 'audit'.
 *
 * Exports:
 *   stripThinkTags()  — strips <think>…</think> from reasoning model output
 *   AiStageError      — typed error carrying a server error code
 *   invokeAiStage()   — one authenticated round trip to `ai-analyze`
 */

import { AI_CONFIG } from '../../config';
import { supabase } from '../supabase';

// ─── Strip <think>…</think> reasoning blocks ──────────────────────────────────
// Some reasoning models wrap chain-of-thought in <think> tags before the JSON.
// Handles complete tags, unclosed tags, and multiline content cleanly.
export const stripThinkTags = (text) => {
    if (!text || typeof text !== 'string') return '';

    // 1. Remove complete <think>...</think> blocks (multiline, case-insensitive)
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Handle unclosed <think> tag (e.g. truncated thinking block before JSON)
    const openThinkIdx = cleaned.search(/<think>/i);
    if (openThinkIdx !== -1) {
        const braceIdx = cleaned.indexOf('{', openThinkIdx);
        cleaned = braceIdx !== -1
            ? cleaned.substring(braceIdx)
            : cleaned.substring(0, openThinkIdx);
    }

    // 3. Remove leftover closing </think> tags
    cleaned = cleaned.replace(/<\/think>/gi, '');

    return cleaned.trim();
};

// ─── Typed transport error ────────────────────────────────────────────────────
/**
 * Carries the server's typed error code so callers can branch without parsing
 * message strings. `code` is one of the values in
 * supabase/functions/_shared/http.ts (QUOTA_EXCEEDED, PROVIDER_TIMEOUT, …).
 */
export class AiStageError extends Error {
    constructor(code, correlationId, message) {
        super(message || code);
        this.name = 'AiStageError';
        this.code = code;
        this.correlationId = correlationId || null;
    }
}

// Error codes that are worth a second attempt from the client's point of view.
// Everything else (quota, auth, bad request, unsupported media) will not
// improve on retry, so the pipeline fails closed instead of burning time.
const RETRYABLE_CODES = new Set(['PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'NETWORK']);

export const isRetryableAiError = (err) =>
    err instanceof AiStageError && RETRYABLE_CODES.has(err.code);

// ─── Edge Function invocation ─────────────────────────────────────────────────
/**
 * Run one pipeline stage on the server.
 *
 * @param {object} args
 * @param {'vision'|'ocr'|'audit'} args.stage
 * @param {string}   [args.imageBase64]     - required for 'vision' and 'ocr'
 * @param {string}   [args.evidenceSummary] - required for 'audit' (text only)
 * @param {string[]} [args.candidates]      - required for 'audit'
 * @returns {Promise<{ text: string, provider: string, model: string, latencyMs: number, correlationId: string }>}
 * @throws {AiStageError}
 */
export const invokeAiStage = async ({ stage, imageBase64, evidenceSummary, candidates }) => {
    if (!AI_CONFIG.stages.includes(stage)) {
        throw new AiStageError('BAD_REQUEST', null, `Unknown AI stage: ${stage}`);
    }

    const payload = stage === 'audit'
        ? { stage, evidenceSummary: evidenceSummary || '', candidates: candidates || [] }
        : { stage, imageBase64 };

    // The Supabase client attaches the current session's JWT automatically.
    // The function derives the caller from that token; nothing identifying is
    // sent in the body.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_CONFIG.edgeFunctionTimeoutMs);

    let response;
    try {
        response = await supabase.functions.invoke(AI_CONFIG.analyzeFunctionName, {
            body: payload,
            signal: controller.signal,
        });
    } catch {
        // Transport-level failure (offline, DNS, aborted). No provider detail
        // exists to leak here.
        throw new AiStageError('NETWORK', null, 'AI service unreachable.');
    } finally {
        clearTimeout(timer);
    }

    const { data, error } = response;

    if (error) {
        // supabase-js surfaces a non-2xx as FunctionsHttpError with the parsed
        // body on `context`. Prefer the server's typed code; never surface the
        // raw message, which may contain transport internals.
        let code = 'PROVIDER_UNAVAILABLE';
        let correlationId = null;
        try {
            const body = await error.context?.json?.();
            if (body?.code) code = body.code;
            if (body?.correlationId) correlationId = body.correlationId;
        } catch {
            // Body was not JSON — keep the conservative default.
        }
        throw new AiStageError(code, correlationId, 'AI stage failed.');
    }

    if (!data?.ok || typeof data.text !== 'string') {
        throw new AiStageError(data?.code || 'PROVIDER_BAD_OUTPUT', data?.correlationId ?? null, 'AI stage returned no result.');
    }

    return {
        text: data.text,
        provider: data.provider ?? null,
        model: data.model ?? null,
        latencyMs: data.latencyMs ?? 0,
        correlationId: data.correlationId ?? null,
    };
};
