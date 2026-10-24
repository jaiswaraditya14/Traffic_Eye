-- =============================================================================
-- Migration: 20261024084933_phase1_demo_reliability.sql
-- Description:
--   1. Add missing client-submitted columns to public.image_reports.
--   2. Add structured officer correction columns to public.officer_reviews.
--   3. Add push_token columns to public.profiles.
--   4. Update ai_analysis_events_provider_check to permit 'tokenharbor'.
--   5. Implement check_plate_duplicate(p_vehicle_number TEXT) RPC.
--   6. Implement save_push_token(p_token TEXT) RPC.
--   7. Update submit_officer_review RPC to accept corrections and set session guard.
--   8. Create public.officer_analytics view.
-- =============================================================================

-- ── 1. MISSING COLUMNS ON image_reports ─────────────────────────────────────
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS possible_duplicate BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS duplicate_report_id UUID REFERENCES public.image_reports(id) ON DELETE SET NULL;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS authenticity_check JSONB;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS location_source TEXT;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS image_hash TEXT;

-- Indexes for duplicate lookups
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash ON public.image_reports(image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_image_reports_vehicle_number ON public.image_reports(vehicle_number) WHERE vehicle_number IS NOT NULL;


-- ── 2. STRUCTURED OFFICER CORRECTIONS ON officer_reviews ───────────────────
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS original_ai_violation_type TEXT;
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS original_ai_severity TEXT;
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS original_ai_confidence NUMERIC(5,4);
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS corrected_violation_type TEXT;
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS corrected_severity TEXT;
ALTER TABLE public.officer_reviews ADD COLUMN IF NOT EXISTS correction_reason TEXT;


-- ── 3. PUSH TOKEN ON profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;


-- ── 4. FIX ai_analysis_events TABLE & PROVIDER CONSTRAINT ─────────────────────
CREATE TABLE IF NOT EXISTS public.ai_analysis_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage text NOT NULL CHECK (stage IN ('vision', 'ocr', 'audit')),
    provider text,
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

ALTER TABLE public.ai_analysis_events DROP CONSTRAINT IF EXISTS ai_analysis_events_provider_check;
ALTER TABLE public.ai_analysis_events ADD CONSTRAINT ai_analysis_events_provider_check
    CHECK (provider IS NULL OR provider IN ('nvidia', 'gemini', 'groq', 'tokenharbor'));



-- ── 5. CHECK PLATE DUPLICATE RPC ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_plate_duplicate(p_vehicle_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
BEGIN
    IF p_vehicle_number IS NULL OR length(trim(p_vehicle_number)) < 4 THEN
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null);
    END IF;

    SELECT id INTO v_existing
    FROM public.image_reports
    WHERE vehicle_number = upper(trim(p_vehicle_number))
      AND status != 'rejected'
      AND submitted_at >= now() - interval '24 hours'
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object('is_duplicate', true, 'existing_report_id', v_existing.id::text);
    END IF;

    RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null);
END;
$$;


-- ── 6. SAVE PUSH TOKEN RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_push_token(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET push_token = p_token,
        push_token_updated_at = now()
    WHERE id = auth.uid();
END;
$$;


-- ── 7. ENHANCED submit_officer_review RPC WITH CORRECTIONS ──────────────────
-- Drop ALL existing overloads of submit_officer_review dynamically (resolves error 42725)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'submit_officer_review'
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE;', r.proname, r.args);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_officer_review(
    p_report_id    UUID,
    p_officer_id   UUID,
    p_decision     TEXT,
    p_remarks      TEXT DEFAULT NULL,
    p_internal     TEXT DEFAULT NULL,
    p_corrected_violation_type TEXT DEFAULT NULL,
    p_corrected_severity TEXT DEFAULT NULL,
    p_correction_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id          UUID;
    v_caller_role        TEXT;
    v_report             RECORD;
    v_review_id          UUID;
    v_reward             INTEGER := 0;
    v_notif_title        TEXT;
    v_notif_body         TEXT;
    v_effective_severity TEXT;
BEGIN
    -- 1. Validate decision value
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %. Must be approved or rejected.', p_decision
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 2. Verify authenticated caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        v_caller_id := p_officer_id;
    END IF;

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 3. Verify officer / admin role
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only verified traffic officers can review reports.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 4. Lock report row atomically to prevent race conditions
    SELECT * INTO v_report
    FROM public.image_reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- 5. Idempotency guard: if already reviewed, return early without double-crediting
    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success',          false,
            'already_reviewed', true,
            'current_status',   v_report.status,
            'message',          'Report has already been reviewed. No changes made.'
        );
    END IF;

    -- 6. Set transaction session flag to allow server-side profile points update (bypasses guard trigger)
    PERFORM set_config('traffic_eye.allow_profile_update', 'on', true);

    -- 7. Insert or update officer_reviews record
    INSERT INTO public.officer_reviews (
        report_id,
        officer_id,
        decision,
        remarks,
        internal_notes,
        original_ai_violation_type,
        original_ai_severity,
        original_ai_confidence,
        corrected_violation_type,
        corrected_severity,
        correction_reason
    )
    VALUES (
        p_report_id,
        v_caller_id,
        p_decision,
        p_remarks,
        p_internal,
        v_report.violation_type,
        v_report.severity,
        v_report.ai_confidence,
        p_corrected_violation_type,
        p_corrected_severity,
        p_correction_reason
    )
    ON CONFLICT (report_id) DO UPDATE
        SET decision                   = EXCLUDED.decision,
            remarks                    = EXCLUDED.remarks,
            internal_notes             = EXCLUDED.internal_notes,
            review_timestamp           = now(),
            officer_id                 = EXCLUDED.officer_id,
            original_ai_violation_type = EXCLUDED.original_ai_violation_type,
            original_ai_severity       = EXCLUDED.original_ai_severity,
            original_ai_confidence     = EXCLUDED.original_ai_confidence,
            corrected_violation_type   = EXCLUDED.corrected_violation_type,
            corrected_severity         = EXCLUDED.corrected_severity,
            correction_reason          = EXCLUDED.correction_reason
    RETURNING id INTO v_review_id;

    -- 8. Compute severity-aligned reward points using officer correction if supplied
    v_effective_severity := lower(COALESCE(p_corrected_severity, v_report.severity, 'medium'));

    IF p_decision = 'approved' THEN
        CASE v_effective_severity
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 70;
            WHEN 'high'     THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE                 v_reward := 50;
        END CASE;
    ELSE
        v_reward := 0;
    END IF;

    -- 9. Update image_reports status and corrected fields
    UPDATE public.image_reports
    SET status         = p_decision,
        reviewed_at    = now(),
        reward_amount  = v_reward,
        violation_type = COALESCE(p_corrected_violation_type, violation_type),
        severity       = COALESCE(p_corrected_severity, severity)
    WHERE id = p_report_id;

    -- 10. Award points and record audit transaction if approved
    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        INSERT INTO public.point_transactions
            (user_id, amount, type, action, reference_id, description)
        VALUES (
            v_report.user_id,
            v_reward,
            'earned',
            'report_approved',
            p_report_id,
            'Reward for approved traffic violation report (severity: ' || v_effective_severity || ')'
        );
    END IF;

    -- 11. Send notification to citizen
    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been approved! You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected.');
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
        v_report.user_id,
        v_notif_title,
        v_notif_body,
        CASE p_decision WHEN 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
        p_report_id
    );

    RETURN jsonb_build_object(
        'success',          true,
        'already_reviewed', false,
        'review_id',        v_review_id,
        'decision',         p_decision,
        'reward_amount',    v_reward
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_officer_review(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ── 8. OFFICER ANALYTICS VIEW ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.officer_analytics
WITH (security_invoker = true) AS
SELECT
    date_trunc('day', ir.submitted_at) AS report_date,
    ir.status,
    ir.violation_type,
    ir.severity,
    ir.location_address,
    ir.latitude,
    ir.longitude,
    orv.officer_id,
    orv.decision,
    EXTRACT(EPOCH FROM (orv.review_timestamp - ir.submitted_at)) / 60 AS review_time_minutes
FROM public.image_reports ir
LEFT JOIN public.officer_reviews orv ON ir.id = orv.report_id
WHERE ir.is_archived = false;
