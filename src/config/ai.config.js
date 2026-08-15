/**
 * ai.config.js — Central AI model registry for Traffic Eye.
 *
 * PRIORITY ORDER (vision, authenticity, OCR):
 *   1. NVIDIA NIM  → integrate.api.nvidia.com/v1  (highest — generous quota)
 *   2. Gemini #1   → gemini-3.5-flash via key slot 1
 *   3. Gemini #2   → gemini-3.5-flash via key slot 2
 *   4. Gemini #3   → gemini-3.7-flash via key slot 1  (stronger, slower fallback)
 *
 * REASONING (text-only, Stage 1.5):
 *   Groq-first (6 keys, text models have no TPM conflict with vision tasks).
 *   NVIDIA + Gemini as fallbacks.
 *
 * PROVIDER SETS (used by buildAttemptQueue in utils.js):
 *   GROQ_MODELS   → provider: 'groq'
 *   NVIDIA_MODELS → provider: 'nvidia'
 *   (all others)  → provider: 'gemini'
 *
 * Last verified: August 2026 against live API key
 *   ✅ gemini-3.5-flash         — works (vision + text)
 *   ✅ gemini-3.7-flash         — works (vision + text, stronger)
 *   ✅ gemini-flash-latest      — works (auto-alias to latest flash)
 *   ❌ gemini-2.0-flash         — deprecated / no longer available
 *   ❌ gemini-2.5-flash         — 404: no longer available to new users
 *   ❌ gemini-2.5-flash-lite    — 404: no longer available to new users
 *
 *   ✅ NVIDIA meta/llama-3.2-11b-vision-instruct — confirmed working
 *   ❌ NVIDIA nvidia/nemotron-* — requires paid tier
 */

// ─── Provider Sets ────────────────────────────────────────────────────────────
export const GROQ_MODELS = new Set([
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
]);

export const NVIDIA_MODELS = new Set([
    'meta/llama-3.2-11b-vision-instruct',   // ✅ Vision — confirmed working
    'meta/llama-3.1-70b-instruct',          // ✅ Text  — confirmed working
    'meta/llama-3.3-70b-instruct',          // Text — latest Llama 3.3
]);

export const AI_CONFIG = {
    // ── API Keys ──────────────────────────────────────────────────────────────
    groqApiKeys: [
        process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_3,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_4,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_5,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_6,
        process.env.EXPO_PUBLIC_GROQ_API_KEY,
    ].filter(Boolean),

    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,   // Gemini slot #1
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,   // Gemini slot #2
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
    ].filter(Boolean),

    nvidiaApiKeys: [
        process.env.EXPO_PUBLIC_NVIDIA_API_KEY_1,
    ].filter(Boolean),

    nvidiaModels: NVIDIA_MODELS,

    // ── Vision: Violation Detection (Stage 1) ─────────────────────────────────
    // Queue expands to: [NVIDIA×1] → [gemini-3.5-flash×keys] → [gemini-3.7-flash×keys]
    visionModels: [
        'meta/llama-3.2-11b-vision-instruct',   // 1. NVIDIA NIM ⭐
        'gemini-3.5-flash',                      // 2. Gemini (all keys) — fast, capable
        'gemini-3.7-flash',                      // 3. Gemini (all keys) — stronger fallback
    ],

    // ── Authenticity: Image Forensics (Stage 0B) ──────────────────────────────
    // Same priority. Never uses Groq (qwen fails JSON mode for auth prompt).
    authenticityModels: [
        'meta/llama-3.2-11b-vision-instruct',   // 1. NVIDIA NIM ⭐
        'gemini-3.5-flash',                      // 2. Gemini (all keys)
        'gemini-3.7-flash',                      // 3. Gemini (all keys) — stronger fallback
    ],

    // ── OCR: Plate Reading (Stage 2, high-res 1600px) ─────────────────────────
    ocrModels: [
        'meta/llama-3.2-11b-vision-instruct',   // 1. NVIDIA NIM ⭐
        'gemini-3.5-flash',                      // 2. Gemini (all keys)
        'gemini-3.7-flash',                      // 3. Gemini (all keys)
    ],

    // ── Reasoning: Validation (Stage 1.5, text-only) ──────────────────────────
    // Groq-first: 6 keys, 12K TPM, separate pool — no collision with vision.
    reasoningModels: [
        'llama-3.3-70b-versatile',               // 1. Groq — Primary (12K TPM × 6 keys) ⭐
        'openai/gpt-oss-20b',                    // 2. Groq — Secondary
        'openai/gpt-oss-120b',                   // 3. Groq — Heavy
        'meta/llama-3.3-70b-instruct',           // 4. NVIDIA NIM — text fallback
        'gemini-3.5-flash',                      // 5. Gemini — fast text fallback
        'gemini-3.7-flash',                      // 6. Gemini — strong text fallback
    ],
};
