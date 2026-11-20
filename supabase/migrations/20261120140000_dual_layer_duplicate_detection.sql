-- =============================================================================
-- Migration: 20261120140000_dual_layer_duplicate_detection.sql
-- Description:
--   1. Ensure image_hash, captured_at, and stale_evidence columns on image_reports.
--   2. Add partial indexes on image_hash and captured_at for O(1) lookups.
--   3. Create SECURITY DEFINER RPC check_image_duplicate(p_hash TEXT) for exact photo deduplication.
--   4. Refine SECURITY DEFINER RPC check_plate_duplicate(p_vehicle_number TEXT) for 24h plate duplicate check.
-- =============================================================================

-- ── 1. ENSURE COLUMNS ON image_reports ─────────────────────────────────────────
ALTER TABLE public.image_reports
    ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS stale_evidence BOOLEAN NOT NULL DEFAULT false;

-- ── 2. CREATE INDEXES FOR FAST LOOKUP ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash
    ON public.image_reports (image_hash)
    WHERE image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_image_reports_captured_at
    ON public.image_reports (captured_at)
    WHERE captured_at IS NOT NULL;

-- ── 3. SECURITY DEFINER RPC: check_image_duplicate ────────────────────────────
-- Checks if an exact identical image (by SHA-256 hash) has already been submitted
-- across all citizens (bypasses RLS safely without exposing any citizen PII).
-- Excludes rejected reports so rejected submissions can be re-filed if needed.
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
      AND status != 'rejected'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_image_duplicate(TEXT) TO authenticated, anon;

-- ── 4. REFINED SECURITY DEFINER RPC: check_plate_duplicate ───────────────────
-- Checks if the same vehicle plate was reported within the last 24 hours.
-- Returns is_duplicate, existing_report_id, and previous_submitted_at for officer review.
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
