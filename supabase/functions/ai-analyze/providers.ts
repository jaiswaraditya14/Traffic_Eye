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

export type Provider = 'openrouter' | 'tokenharbor' | 'nvidia' | 'gemini' | 'groq';

export interface Attempt {
  provider: Provider;
  model: string;
}

/** Server-owned allow-list. Anything not listed here can never be called. */
export const ALLOWED_MODELS: Record<Provider, ReadonlySet<string>> = {
  gemini: new Set([
    // Primary multimodal vision and reasoning models
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
  ]),
  openrouter: new Set([
    // Primary Vision & Scene Perception (super fast ~3s, 1M context, robust forensic analysis)
    'nvidia/nemotron-3.5-super-vl:free',
    // Secondary Multimodal Reasoning & Plate OCR (30B multimodal reasoning with character extraction)
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    // High-capability vision fallbacks
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'particle-ai/particle-1:free',
    'inclusionai/ling-3.2-flash:free',
    // Text-only audit & consistency evaluation models
    'nvidia/nemotron-3.5-lightning:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'meta-llama/llama-3.2-11b-vision-instruct',
    'google/gemini-2.0-flash-001',
    'google/gemini-2.5-flash',
  ]),
  tokenharbor: new Set([]),
  nvidia: new Set([]),
  groq: new Set([]),
};

/**
 * Ordered attempt chain per stage.
 * Primary: Google Gemini 3.5 Flash Lite (ultra fast ~2.9s, high availability, scene perception + OCR).
 * Fallbacks: Gemini 2.5 Flash, then OpenRouter models.
 */
export const STAGE_ATTEMPTS: Record<'vision' | 'ocr' | 'audit', readonly Attempt[]> = {
  vision: [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free' },
    { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' },
  ],
  ocr: [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free' },
    { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' },
  ],
  audit: [
    { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free' },
  ],
};

export const STAGE_TIMEOUT_MS: Record<'vision' | 'ocr' | 'audit', number> = {
  vision: 18_000,
  ocr: 14_000,
  audit: 10_000,
};

export const STAGE_MAX_TOKENS: Record<'vision' | 'ocr' | 'audit', number> = {
  vision: 2048,
  ocr: 2048,
  audit: 1500,
};

const ENV_KEYS: Record<Provider, readonly string[]> = {
  gemini: ['GEMINI_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY_1', 'OPENROUTER_API_KEY_2'],
  tokenharbor: [],
  nvidia: [],
  groq: [],
};

/** Keys configured for a provider, in rotation order. Deduplicated and never logged. */
export function keysFor(provider: Provider): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const name of ENV_KEYS[provider]) {
    const val = Deno.env.get(name)?.trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      keys.push(val);
    }
  }
  return keys;
}

export function anyProviderConfigured(): boolean {
  return (['gemini', 'openrouter', 'tokenharbor', 'nvidia', 'groq'] as Provider[]).some((p) => keysFor(p).length > 0);
}

export function providerConfiguredFor(stage: 'vision' | 'ocr' | 'audit'): boolean {
  return STAGE_ATTEMPTS[stage].some(({ provider }) => keysFor(provider).length > 0);
}

export class ProviderError extends Error {
  attempts = 0;
  latencyMs = 0;
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
 * One provider call to OpenRouter. Returns raw assistant text.
 * Throws ProviderError with a typed code; upstream body is never leaked.
 */
async function callOpenRouter(a: CallArgs): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const body = JSON.stringify({
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
    temperature: 0.1,
    max_tokens: Math.max(a.maxTokens, 2048),
    top_p: 0.9,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), a.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.apiKey}`,
        'HTTP-Referer': 'https://trafficeye.app',
        'X-Title': 'Traffic Eye AI',
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      await res.body?.cancel();
      const code: ErrCode =
        res.status >= 500 || res.status === 402 || res.status === 429
          ? ERR.PROVIDER_UNAVAILABLE
          : ERR.PROVIDER_BAD_OUTPUT;
      throw new ProviderError(code, res.status, `upstream status ${res.status}`);
    }

    const json = await res.json();
    const choice = json?.choices?.[0];
    const text = choice?.message?.content || choice?.message?.reasoning;

    if (typeof text !== 'string' || text.length === 0 || text.length > 16_000) {
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

/**
 * One provider call to Google Gemini Generative Language API.
 * High-speed native multimodal inference using Google AI Studio.
 */
async function callGemini(a: CallArgs): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${a.model}:generateContent?key=${encodeURIComponent(a.apiKey)}`;

  const parts: Array<Record<string, unknown>> = [{ text: a.prompt }];
  if (a.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: a.imageBase64,
      },
    });
  }

  const body = JSON.stringify({
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: Math.max(a.maxTokens, 2048),
      responseMimeType: 'application/json',
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), a.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      await res.body?.cancel();
      const code: ErrCode =
        res.status >= 500 || res.status === 402 || res.status === 429
          ? ERR.PROVIDER_UNAVAILABLE
          : ERR.PROVIDER_BAD_OUTPUT;
      throw new ProviderError(code, res.status, `upstream status ${res.status}`);
    }

    const json = await res.json();
    const candidate = json?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (typeof text !== 'string' || text.length === 0 || text.length > 16_000) {
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

async function callProvider(a: CallArgs): Promise<string> {
  if (!ALLOWED_MODELS[a.provider]?.has(a.model)) {
    throw new ProviderError(ERR.INTERNAL, null, 'model not in allow-list');
  }

  if (a.provider === 'gemini') {
    return callGemini(a);
  }
  if (a.provider === 'openrouter') {
    return callOpenRouter(a);
  }
  throw new ProviderError(ERR.INTERNAL, null, `unsupported provider ${a.provider}`);
}

export interface RotationResult {
  text: string;
  provider: Provider;
  model: string;
  attempts: number;
  latencyMs: number;
}

/**
 * Walk the stage's attempt chain, rotating keys within providers.
 *
 * Rate-limit & fallback policy:
 *   429 (rate limit)        → advance to next key
 *   402 (balance zero)      → advance to next key
 *   5xx / timeout / network → advance to next key / model
 *   other 4xx               → stop (auth error, malformed request)
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
          status === 429 ||
          status === 402;
        if (!transient) {
          const failure = last;
          failure.attempts = attempts;
          failure.latencyMs = Date.now() - started;
          throw failure;
        }
      }
    }
  }

  const failure = last ?? new ProviderError(ERR.NOT_CONFIGURED, null, 'no attempt executed');
  failure.attempts = attempts;
  failure.latencyMs = Date.now() - started;
  throw failure;
}
