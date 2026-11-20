-- ═══════════════════════════════════════════════════════════════════════════
-- Traffic Eye — Dual-Layer Duplicate Detection & Integrity
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ensure image_hash, captured_at, stale_evidence, and authenticity_check columns exist
ALTER TABLE public.image_reports
    ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS stale_evidence BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS authenticity_check JSONB DEFAULT NULL;

-- 2. Create indexes for fast O(1) lookups
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash
    ON public.image_reports (image_hash)
    WHERE image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_image_reports_captured_at
    ON public.image_reports (captured_at)
    WHERE captured_at IS NOT NULL;

-- 3. Create SECURITY DEFINER RPC function for cross-user image hash duplicate check
-- Why SECURITY DEFINER?
-- RLS (Row Level Security) restricts citizens to seeing ONLY their own reports.
-- This function allows the backend to check if an image hash exists across ALL
-- citizens' submitted reports without exposing any personal data.
CREATE OR REPLACE FUNCTION public.check_image_duplicate(p_hash TEXT)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_report_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_hash IS NULL OR length(trim(p_hash)) < 16 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE, id
    FROM public.image_reports
    WHERE image_hash = lower(trim(p_hash))
      AND status != 'rejected'  -- Rejected reports do not block re-submission
    LIMIT 1;

    -- If no row found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

-- Grant execution permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_image_duplicate(TEXT) TO authenticated, anon;

-- 4. Create/Refine 24-hour vehicle plate duplicate check
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
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null, 'previous_submitted_at', null);
    END IF;

    SELECT id, submitted_at INTO v_existing
    FROM public.image_reports
    WHERE vehicle_number = upper(trim(p_vehicle_number))
      AND status != 'rejected'
      AND submitted_at >= now() - interval '24 hours'
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_duplicate', true,
            'existing_report_id', v_existing.id::text,
            'previous_submitted_at', v_existing.submitted_at
        );
    END IF;

    RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null, 'previous_submitted_at', null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_plate_duplicate(TEXT) TO authenticated, anon;

-- ─── Verification ────────────────────────────────────────────────────────────
SELECT * FROM public.check_image_duplicate('test_hash_sample_0123456789abcdef');
