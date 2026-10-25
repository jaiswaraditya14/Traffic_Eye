-- Allow 'openrouter' in ai_analysis_events provider check constraint
-- OpenRouter is the primary AI provider for vision, OCR, and audit stages.

ALTER TABLE public.ai_analysis_events DROP CONSTRAINT IF EXISTS ai_analysis_events_provider_check;
ALTER TABLE public.ai_analysis_events ADD CONSTRAINT ai_analysis_events_provider_check
    CHECK (provider IS NULL OR provider IN ('openrouter', 'tokenharbor', 'nvidia', 'gemini', 'groq'));
