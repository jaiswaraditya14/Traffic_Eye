/**
 * ai/utils.js — Shared AI utility functions
 *
 * Imported by both ai/index.js and ai/authenticity.js.
 * Keeping these in a separate file avoids circular imports.
 *
 * Exports:
 *   stripThinkTags()    — strips <think>…</think> from reasoning model output
 *   buildAttemptQueue() — builds model × key rotation queue
 *   runWithRotation()   — executes queue with smart fallback (5xx/timeout only)
 *   callAI()            — universal NVIDIA + Gemini HTTP caller
 *
 * Fallback policy:
 *   Advance to the next model/key ONLY on:
 *     • 5xx server errors (provider unavailable, overloaded)
 *     • Timeout / AbortError / network failure
 *   Do NOT advance on:
 *     • 4xx client errors (bad key, billing, rate limit 429, bad request 400)
 *       — these will be the same for any key from the same account
 *     • JSON parse failures — if the model produced garbage, other models
 *       are unlikely to be asked the same question with a better result.
 */

import { AI_CONFIG, GROQ_MODELS, NVIDIA_MODELS } from '../../config';

// ─── Strip <think>…</think> reasoning blocks ──────────────────────────────────
// Qwen and DeepSeek on Groq wrap chain-of-thought in <think> tags before JSON.
// Handles complete tags, unclosed tags, and multiline content cleanly.
export const stripThinkTags = (text) => {
    if (!text || typeof text !== 'string') return '';

    // 1. Remove complete <think>...</think> blocks (multiline, case-insensitive)
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Handle unclosed <think> tag (e.g. truncated thinking block before JSON)
    const openThinkIdx = cleaned.search(/<think>/i);
    if (openThinkIdx !== -1) {
        const braceIdx = cleaned.indexOf('{', openThinkIdx);
        if (braceIdx !== -1) {
            cleaned = cleaned.substring(braceIdx);
        } else {
            cleaned = cleaned.substring(0, openThinkIdx);
        }
    }

    // 3. Remove leftover closing </think> tags
    cleaned = cleaned.replace(/<\/think>/gi, '');

    return cleaned.trim();
};

// ─── Build model × key attempt queue ─────────────────────────────────────────
// Strategy: exhaust ALL keys for Model A before moving to Model B.
// Uses the explicit GROQ_MODELS Set — no fragile string-sniffing.
export const buildAttemptQueue = (modelsArray) => {
    const entries = modelsArray.map((model) => {
        if (GROQ_MODELS.has(model)) return { model, provider: 'groq', keys: AI_CONFIG.groqApiKeys || [] };
        if (NVIDIA_MODELS.has(model)) return { model, provider: 'nvidia', keys: AI_CONFIG.nvidiaApiKeys || [] };
        return { model, provider: 'gemini', keys: AI_CONFIG.geminiApiKeys || [] };
    });

    const queue = [];
    // Try the primary key of each provider/model before rotating keys. This
    // gives NVIDIA priority while keeping Gemini a genuine fast fallback.
    for (const entry of entries) {
        if (entry.keys[0]) queue.push({ model: entry.model, apiKey: entry.keys[0], provider: entry.provider });
    }
    for (const entry of entries) {
        for (const apiKey of entry.keys.slice(1)) {
            queue.push({ model: entry.model, apiKey, provider: entry.provider });
        }
    }
    return queue;
};

// ─── Universal AI HTTP caller (Groq + Gemini) ────────────────────────────────
// Single source of truth for all AI API calls.
// Per-stage token limits and timeouts are passed by the caller via maxTokens / timeoutMs.
export const callAI = async ({
    model,
    apiKey,
    provider,
    prompt,
    base64Image,
    maxTokens = 512,
    timeoutMs = 45000,
    jsonMode = false,
    responseSchema,
}) => {
    if (!apiKey) throw new Error(`${provider} API key undefined — check .env`);

    const isGroq     = provider === 'groq';
    const isNvidia   = provider === 'nvidia';
    const isOAICompat = isGroq || isNvidia;  // Both use OpenAI-compatible format
    const isTextOnly = !base64Image;

    const url = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : isNvidia
            ? 'https://integrate.api.nvidia.com/v1/chat/completions'
            : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const isGpt120b = model === 'openai/gpt-oss-120b';

    const body = isOAICompat
        ? JSON.stringify({
            model,
            messages: [{
                role: 'user',
                content: isTextOnly
                    ? prompt
                    : [
                        { type: 'text',      text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                    ],
            }],
            // JSON mode: Groq supports response_format; NVIDIA does not — rely on prompt instead
            ...(jsonMode && isGroq ? { response_format: { type: 'json_object' } } : {}),
            temperature:              isGpt120b ? 1 : 0.1,
            // Groq uses max_completion_tokens; NVIDIA/OpenAI use max_tokens
            ...(isGroq   ? { max_completion_tokens: maxTokens } : {}),
            ...(isNvidia ? { max_tokens: maxTokens }            : {}),
            top_p: isGpt120b ? 1 : 0.9,
            ...(isGpt120b ? { reasoning_effort: 'medium' } : {}),
        })
        : JSON.stringify({
            contents: [{
                parts: isTextOnly
                    ? [{ text: prompt }]
                    : [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
                    ],
            }],
            generationConfig: {
                temperature:      0.1,
                maxOutputTokens:  maxTokens,   // ← was missing — Gemini was generating unbounded responses
                candidateCount:   1,
                responseMimeType: jsonMode ? 'application/json' : 'text/plain',
                ...(jsonMode && responseSchema ? { responseSchema } : {}),
            },
        });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(isOAICompat ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body,
            signal: controller.signal,
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`${provider} HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }

        const json = await res.json();
        if (isOAICompat) {
            if (!json.choices?.length) throw new Error('No choices in OpenAI-compat response');
            return json.choices[0].message.content;
        }
        if (!json.candidates?.length) throw new Error('No candidates in Gemini response');
        return json.candidates[0].content.parts[0].text;
    } finally {
        clearTimeout(timer);
    }
};

// ─── Run one stage with model+key rotation ────────────────────────────────────
// Returns { text, parsed, winningAttempt } on first success.
// Per-stage token limits and timeouts are forwarded to callAI via callOptions.
//
// Fallback policy (fail-fast on client errors):
//   • 5xx / timeout / AbortError → try next attempt (server-side transient fault)
//   • 4xx (400, 401, 403, 429)  → stop immediately (client-side, will not improve)
//   • JSON parse failure         → stop immediately (model output issue, not availability)
export const runWithRotation = async (prompt, base64Image, attempts, label, callOptions = {}) => {
    let lastError = null;
    const maxAttempts = Math.max(1, callOptions.maxAttempts || attempts.length);
    for (const attempt of attempts.slice(0, maxAttempts)) {
        const { model, apiKey, provider } = attempt;
        const tag = `[${label}] provider=${provider} model=${model}`;
        console.log(`${tag} → trying`);
        try {
            const text = await callAI({ model, apiKey, provider, prompt, base64Image, ...callOptions });

            let parsed = null;
            if (typeof callOptions.validateAndParse === 'function') {
                parsed = callOptions.validateAndParse(text);
            }

            console.log(`${tag} → ✅ success`);
            return { text, parsed, winningAttempt: attempt };
        } catch (err) {
            lastError = err;
            const msg = err.message || '';

            // Categorise error type
            const isTimeout  = err.name === 'AbortError' || msg.toLowerCase().includes('network') || msg.includes('TIMEOUT');
            const is5xx      = /HTTP 5\d\d/.test(msg);
            const is4xx      = /HTTP [4]\d\d/.test(msg);
            const is429      = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit');
            const isParse    = msg.includes('JSON') || msg.includes('parse') || msg.includes('confidence');

            const canRetry = isTimeout || is5xx;   // only transient server-side faults warrant a retry
            const mustStop = isParse || (is4xx && !is429);  // bad request, auth failure, billing — won't fix by rotating

            const category = isTimeout  ? 'TIMEOUT'
                           : is5xx      ? '5XX'
                           : is429      ? 'QUOTA/429'
                           : is4xx      ? '4XX-STOP'
                           : isParse    ? 'PARSE FAIL'
                           : 'ERROR';

            console.warn(`${tag} → ✗ ${category}: ${msg.slice(0, 200)}`);

            if (mustStop) {
                // Non-transient error — stop the entire rotation immediately.
                break;
            }
            if (!canRetry) {
                // Quota/rate-limit: try the next key in the rotation (different account).
                // For other unknown errors: also try the next attempt.
                // (Fall through to next loop iteration)
            }
        }
    }
    throw lastError ?? new Error(`${label}: all attempts failed`);
};
