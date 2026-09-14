-- Traffic Eye Phase 1 only. Apply once in Supabase SQL Editor before deploying ai-analyze.
-- This is the forward-only repair, NOT the local baseline. No auth/OAuth settings change.
-- Stop on an error; the transaction rolls back. Do not run baseline/reset SQL on hosted data.
BEGIN;

CREATE TABLE public.ai_analysis_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage text NOT NULL CHECK (stage IN ('vision', 'ocr', 'audit')),
    provider text CHECK (provider IN ('nvidia', 'gemini', 'groq')),
    model text CHECK (char_length(model) <= 128),
    correlation_id text NOT NULL CHECK (correlation_id ~ '^[A-Za-z0-9_-]{8,64}$'),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
    outcome text NOT NULL CHECK (outcome IN ('pending', 'success', 'failure')),
    failure_code text CHECK (failure_code IN (
        'METHOD_NOT_ALLOWED', 'UNAUTHENTICATED', 'FORBIDDEN', 'BAD_REQUEST',
        'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'QUOTA_EXCEEDED',
        'PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'PROVIDER_BAD_OUTPUT',
        'NOT_CONFIGURED', 'INTERNAL'
    )),
    request_bytes integer NOT NULL CHECK (request_bytes BETWEEN 0 AND 8388608),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Supports own-row RLS, both rolling quota windows, and the profile FK.
CREATE INDEX ai_analysis_events_user_created_idx
    ON public.ai_analysis_events (user_id, created_at DESC);

ALTER TABLE public.ai_analysis_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_analysis_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_analysis_events TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_analysis_events TO service_role;
-- Only the completion fields can be updated by the Edge Function.
GRANT UPDATE (provider, model, attempts, latency_ms, outcome, failure_code)
    ON TABLE public.ai_analysis_events TO service_role;

CREATE POLICY ai_analysis_events_read_own
    ON public.ai_analysis_events FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE public.ai_analysis_events IS
    'Server-owned AI request quota ledger; no evidence, EXIF, location, tokens or provider payloads. Pending reservations count against quota.';

-- Invoker privileges, service_role execution only: no client can choose p_user_id.
-- The Edge Function supplies the identity obtained from auth.getUser().
-- Reserve before calling providers so concurrency or a lost completion write cannot
-- bypass the quota. Limits are fixed here, never accepted from a client.
CREATE FUNCTION public.reserve_ai_analysis_event(
    p_user_id uuid,
    p_stage text,
    p_correlation_id text,
    p_request_bytes integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_now timestamptz;
    v_hour_count bigint;
    v_day_count bigint;
    v_event_id uuid;
BEGIN
    IF p_user_id IS NULL OR p_stage IS NULL OR p_stage NOT IN ('vision', 'ocr', 'audit')
       OR p_correlation_id IS NULL OR p_correlation_id !~ '^[A-Za-z0-9_-]{8,64}$'
       OR p_request_bytes IS NULL OR p_request_bytes NOT BETWEEN 0 AND 8388608 THEN
        RETURN jsonb_build_object('code', 'BAD_REQUEST');
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('traffic-eye:ai-quota:' || p_user_id::text, 0)
    );
    -- Evaluate the window after obtaining the lock, using database time.
    v_now := pg_catalog.clock_timestamp();
    SELECT count(*) FILTER (WHERE created_at >= v_now - interval '1 hour'), count(*)
      INTO v_hour_count, v_day_count
      FROM public.ai_analysis_events
     WHERE user_id = p_user_id AND created_at >= v_now - interval '1 day';

    IF v_hour_count >= 40 OR v_day_count >= 200 THEN
        RETURN jsonb_build_object('code', 'QUOTA_EXCEEDED');
    END IF;

    INSERT INTO public.ai_analysis_events (
        user_id, stage, correlation_id, request_bytes, outcome, created_at
    ) VALUES (
        p_user_id, p_stage, p_correlation_id, p_request_bytes, 'pending', v_now
    ) RETURNING id INTO v_event_id;

    RETURN jsonb_build_object('eventId', v_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_analysis_event(uuid, text, text, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_analysis_event(uuid, text, text, integer)
    TO service_role;

COMMIT;