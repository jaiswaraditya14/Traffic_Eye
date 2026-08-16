/**
 * ai/utils.js — Shared AI utility functions
 *
 * Imported by both ai/index.js and ai/authenticity.js.
 * Keeping these in a separate file avoids circular imports.
 *
 * Exports:
 *   stripThinkTags()    — strips <think>…</think> from reasoning model output
 *   buildAttemptQueue() — builds model × key rotation queue
 *   runWithRotation()   — executes queue with smart fallback
 *   callAI()            — universal Groq + Gemini HTTP caller
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
    const queue = [];
    for (const model of modelsArray) {
        if (GROQ_MODELS.has(model)) {
            for (const apiKey of (AI_CONFIG.groqApiKeys || [])) {
                queue.push({ model, apiKey, provider: 'groq' });
            }
        } else if (NVIDIA_MODELS.has(model)) {
            for (const apiKey of (AI_CONFIG.nvidiaApiKeys || [])) {
                queue.push({ model, apiKey, provider: 'nvidia' });
            }
        } else {
            // Gemini — one entry per key so Gemini #1 is tried before Gemini #2
            for (const apiKey of (AI_CONFIG.geminiApiKeys || [])) {
                queue.push({ model, apiKey, provider: 'gemini' });
            }
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
export const runWithRotation = async (prompt, base64Image, attempts, label, callOptions = {}) => {
    let lastError = null;
    for (const attempt of attempts) {
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
            const isQuota   = err.message.includes('429') || err.message.toLowerCase().includes('quota');
            const isNetwork = err.name === 'AbortError' || err.message.toLowerCase().includes('network');
            const isParse   = err.message.includes('JSON') || err.message.includes('parse') || err.message.includes('confidence');
            console.warn(`${tag} → ✗ ${isQuota ? 'QUOTA' : isNetwork ? 'TIMEOUT' : isParse ? 'PARSE FAIL' : 'ERROR'}: ${err.message}`);
        }
    }
    throw lastError ?? new Error(`${label}: all attempts failed`);
};
