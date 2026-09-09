/**
 * AI model registry — Traffic Eye
 *
 * Architecture: AI SEES → CODE DECIDES → UNCERTAINTY → MANUAL REVIEW
 *
 * ── Security boundary ───────────────────────────────────────────────────────
 * This file deliberately contains NO API keys and NO provider endpoints.
 *
 * Provider credentials live only in Supabase Edge Function secrets and are
 * used exclusively by `supabase/functions/ai-analyze`. Anything placed in an
 * `EXPO_PUBLIC_*` variable is inlined into the JS bundle and is extractable
 * from any installed APK/IPA, so it is not a secret.
 *
 * Model selection, prompt text, timeouts, rotation, and per-user quota are
 * all owned by the Edge Function. The client may only name a pipeline stage.
 */

export const AI_CONFIG = {
    // Pipeline stages the client is permitted to request from the server.
    // The server maps each stage to its own prompt and model allow-list.
    stages: ['vision', 'ocr', 'audit'],

    // Client-side deadline for the Edge Function round trip. The authoritative
    // per-provider timeout is enforced server-side; this is only so the UI
    // cannot hang if the network stalls.
    edgeFunctionTimeoutMs: 25000,

    // Name of the Edge Function that owns all provider access.
    analyzeFunctionName: 'ai-analyze',
};
