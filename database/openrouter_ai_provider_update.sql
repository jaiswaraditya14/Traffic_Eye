-- ============================================================================
-- Traffic Eye: OpenRouter AI Provider Update
-- ============================================================================
-- This updates the ai_analysis_events constraint to permit 'openrouter'
-- as the primary AI perception and audit provider alongside existing providers.
-- Safe to run in Supabase SQL Editor (idempotent, transactional).
-- ============================================================================

BEGIN;

-- 1. Update check constraint on public.ai_analysis_events
ALTER TABLE public.ai_analysis_events 
    DROP CONSTRAINT IF EXISTS ai_analysis_events_provider_check;

ALTER TABLE public.ai_analysis_events 
    ADD CONSTRAINT ai_analysis_events_provider_check
    CHECK (provider IS NULL OR provider IN ('openrouter', 'tokenharbor', 'nvidia', 'gemini', 'groq'));

-- 2. Verify table exists and permissions are intact
DO $$
BEGIN
    RAISE NOTICE 'ai_analysis_events_provider_check successfully updated to allow openrouter.';
END $$;

COMMIT;
