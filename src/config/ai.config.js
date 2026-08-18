/**
 * AI model registry — Traffic Eye Production Configuration
 *
 * Architecture: AI SEES → CODE DECIDES → GROQ AUDITS → UNCERTAINTY → MANUAL REVIEW
 *
 * Provider roles:
 *   NVIDIA NIM   — Primary visual perception (SEES)
 *   Gemini Flash — Fallback visual perception (SEES, only on NVIDIA failure)
 *   Groq         — Text-only consistency auditor (AUDITS, never sees images)
 *
 * ⚠️  SECURITY NOTE: These keys are bundled into the React Native APK/IPA.
 * Any motivated user can extract them from the binary. For production:
 *   - Restrict each key's scope to only the Traffic Eye app (per-provider API settings).
 *   - Rate-limit keys at the provider level.
 *   - Rotate keys regularly.
 *   - Consider a backend API proxy so keys never ship in the client bundle.
 */

export const GROQ_MODELS = new Set([
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3.6-27b',
    'llama-3.3-70b-versatile',
]);

export const NVIDIA_MODELS = new Set([
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.3-70b-instruct',
]);

export const AI_CONFIG = {
    // ── API keys (read at runtime; never hard-coded) ──────────────────────────
    nvidiaApiKeys: [
        process.env.EXPO_PUBLIC_NVIDIA_API_KEY_1,
        process.env.EXPO_PUBLIC_NVIDIA_API_KEY,
    ].filter(Boolean),

    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    ].filter(Boolean),

    // Groq is TEXT-ONLY in this account — 6 keys for auditor rotation.
    // Groq must NEVER receive an image payload.
    groqApiKeys: [
        process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_3,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_4,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_5,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_6,
        process.env.EXPO_PUBLIC_GROQ_API_KEY,
    ].filter(Boolean),

    // ── Pipeline stage model lists (ordered: primary → fallback) ─────────────
    // NVIDIA Llama 11B = primary visual perception
    // Gemini 3.5 Flash = fallback visual perception (called only on NVIDIA failure)
    visionModels: [
        'meta/llama-3.2-11b-vision-instruct',
        'gemini-3.5-flash',
    ],
    ocrModels: [
        'meta/llama-3.2-11b-vision-instruct',
        'gemini-3.5-flash',
    ],
    // Groq GPT-OSS-20B = text-only consistency auditor
    reasoningModels: [
        'openai/gpt-oss-20b',
    ],

    // ── Per-stage hard timeouts (ms) ─────────────────────────────────────────
    // Each stage gets exactly one primary attempt within its budget.
    // Fallback to Gemini is counted as a second attempt within visionMs budget.
    timeoutVisionMs:   12000,  // 12s per provider attempt (primary + fallback separate)
    timeoutOcrMs:      10000,  // 10s — conditional, only when plate unresolved
    timeoutAuditorMs:   8000,  // 8s — Groq text-only audit; fast model (~490ms typical)

    // Max attempts before a stage is considered failed
    maxAttemptsPerStage: 2,
};
