/**
 * Provider transport for the ai-analyze Edge Function.
 *
 * Secrets are read from the function environment (`supabase secrets set …`)
 * and never leave this process. The only thing the client learns about a
 * provider failure is a typed code from `_shared/http.ts`.
 *
 * Model choice is an allow-list keyed by pipeline stage — the client cannot
 * name a model, a provider, an endpoint, or a prompt.
 */

import { ERR, type ErrCode } from '../_shared/http.ts';

export type Provider = 'nvidia' | 'gemini' | 'groq';

export interface Attempt {
  provider: Provider;
  model: string;
}

/** Server-owned allow-list. Anything not listed here can never be called. */
export const ALLOWED_MODELS: Record<Provider, ReadonlySet<string>> = {
  nvidia: new Set([
    'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
    'meta/llama-3.2-11b-vision-instruct',
  ]),
  gemini: new Set(['gemini-3.5-flash']),
  groq: new Set(['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile']),
};

/** Ordered attempt chain per stage: primary first, fallback second. */
export const STAGE_ATTEMPTS: Record<'vision' | 'ocr' | 'audit', readonly Attempt[]> = {
  vision: [
    { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1' },
    { provider: 'nvidia', model: 'meta/llama-3.2-11b-vision-instruct' },
    { provider: 'gemini', model: 'gemini-3.5-flash' },
  ],
  ocr: [
    { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1' },
    { provider: 'nvidia', model: 'meta/llama-3.2-11b-vision-instruct' },
    { provider: 'gemini', model: 'gemini-3.5-flash' },
  ],
  // Text-only audit. Groq never receives image bytes.
  audit: [{ provider: 'groq', model: 'openai/gpt-oss-20b' }],
};

export const STAGE_TIMEOUT_MS: Record<'vision' | 'ocr' | 'audit', number> = {
  vision: 12_000,
  ocr: 10_000,
  audit: 8_000,
};

export const STAGE_MAX_TOKENS: Record<'vision' | 'ocr' | 'audit', number> = {
  vision: 512,
  ocr: 256,
  audit: 384,
};

const ENV_KEYS: Record<Provider, readonly string[]> = {
  nvidia: ['NVIDIA_API_KEY_1', 'NVIDIA_API_KEY_2', 'NVIDIA_API_KEY_3'],
  gemini: ['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3'],
  groq: [
    'GROQ_API_KEY_1',
    'GROQ_API_KEY_2',
    'GROQ_API_KEY_3',
    'GROQ_API_KEY_4',
    'GROQ_API_KEY_5',
    'GROQ_API_KEY_6',
  ],
};

/** Keys configured for a provider, in rotation order. Values never logged. */
export function keysFor(provider: Provider): string[] {
  return ENV_KEYS[provider]
    .map((name) => Deno.env.get(name))
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}

export function anyProviderConfigured(): boolean {
  return (['nvidia', 'gemini', 'groq'] as Provider[]).some((p) => keysFor(p).length > 0);
}

export class ProviderError extends Error {
  constructor(
    readonly code: ErrCode,
    /** Upstream HTTP status, if any. Used for retry policy and metrics only. */
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

interface CallArgs {
  provider: Provider;
  model: string;
  apiKey: string;
  prompt: string;
  imageBase64: string | null;
  maxTokens: number;
  timeoutMs: number;
  jsonMode: boolean;
}

/**
 * One provider call. Returns the raw assistant text.
 * Throws ProviderError with a typed code; the upstream body is never attached.
 */
async function callProvider(a: CallArgs): Promise<string> {
  if (!ALLOWED_MODELS[a.provider].has(a.model)) {
    throw new ProviderError(ERR.INTERNAL, null, 'model not in allow-list');
  }

  const oaiCompatible = a.provider === 'groq' || a.provider === 'nvidia';
  const isGpt120b = a.model === 'openai/gpt-oss-120b';

  const url =
    a.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : a.provider === 'nvidia'
        ? 'https://integrate.api.nvidia.com/v1/chat/completions'
        : `https://generativelanguage.googleapis.com/v1beta/models/${a.model}:generateContent`;

  const body = oaiCompatible
    ? JSON.stringify({
        model: a.model,
        messages: [
          {
            role: 'user',
            content: a.imageBase64
              ? [
                  { type: 'text', text: a.prompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${a.imageBase64}` } },
                ]
              : a.prompt,
          },
        ],
        ...(a.jsonMode && a.provider === 'groq' ? { response_format: { type: 'json_object' } } : {}),
        temperature: isGpt120b ? 1 : 0.1,
        ...(a.provider === 'groq' ? { max_completion_tokens: a.maxTokens } : { max_tokens: a.maxTokens }),
        top_p: isGpt120b ? 1 : 0.9,
        ...(isGpt120b ? { reasoning_effort: 'medium' } : {}),
      })
    : JSON.stringify({
        contents: [
          {
            parts: a.imageBase64
              ? [
                  { text: a.prompt },
                  { inline_data: { mime_type: 'image/jpeg', data: a.imageBase64 } },
                ]
              : [{ text: a.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: a.maxTokens,
          candidateCount: 1,
          responseMimeType: a.jsonMode ? 'application/json' : 'text/plain',
        },
      });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), a.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Gemini takes the key in a header so it never appears in a URL that
        // could be captured by proxy access logs.
        ...(oaiCompatible ? { Authorization: `Bearer ${a.apiKey}` } : { 'x-goog-api-key': a.apiKey }),
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      // Drain and discard: the body may echo the prompt or key material.
      await res.body?.cancel();
      const code: ErrCode = res.status >= 500 ? ERR.PROVIDER_UNAVAILABLE : ERR.PROVIDER_BAD_OUTPUT;
      throw new ProviderError(code, res.status, `upstream status ${res.status}`);
    }

    const json = await res.json();
    const text = oaiCompatible
      ? json?.choices?.[0]?.message?.content
      : json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== 'string' || text.length === 0) {
      throw new ProviderError(ERR.PROVIDER_BAD_OUTPUT, null, 'empty completion');
    }
    return text;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ProviderError(ERR.PROVIDER_TIMEOUT, null, 'timeout');
    }
    throw new ProviderError(ERR.PROVIDER_UNAVAILABLE, null, 'network failure');
  } finally {
    clearTimeout(timer);
  }
}

export interface RotationResult {
  text: string;
  provider: Provider;
  model: string;
  attempts: number;
  latencyMs: number;
}

/**
 * Walk the stage's attempt chain, rotating keys within a provider.
 *
 * Retry policy mirrors the previous client behaviour:
 *   5xx / timeout / network  → advance
 *   429 / quota              → advance (next key is a different account)
 *   other 4xx                → stop (auth, billing, malformed request)
 */
export async function runStage(
  stage: 'vision' | 'ocr' | 'audit',
  prompt: string,
  imageBase64: string | null,
  jsonMode: boolean,
): Promise<RotationResult> {
  const started = Date.now();
  let attempts = 0;
  let last: ProviderError | null = null;

  for (const attempt of STAGE_ATTEMPTS[stage]) {
    const keys = keysFor(attempt.provider);
    for (const apiKey of keys) {
      attempts++;
      try {
        const text = await callProvider({
          provider: attempt.provider,
          model: attempt.model,
          apiKey,
          prompt,
          imageBase64,
          maxTokens: STAGE_MAX_TOKENS[stage],
          timeoutMs: STAGE_TIMEOUT_MS[stage],
          jsonMode,
        });
        return {
          text,
          provider: attempt.provider,
          model: attempt.model,
          attempts,
          latencyMs: Date.now() - started,
        };
      } catch (err) {
        last = err as ProviderError;
        const status = last.status;
        const transient =
          last.code === ERR.PROVIDER_TIMEOUT ||
          last.code === ERR.PROVIDER_UNAVAILABLE ||
          status === 429;
        if (!transient) break; // hard 4xx — rotating keys will not help
      }
    }
  }

  throw last ?? new ProviderError(ERR.PROVIDER_UNAVAILABLE, null, 'no attempt executed');
}
