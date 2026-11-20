-- =============================================================================
-- Migration: 20261120181820_duplicate_image_hash_prevention.sql
-- Description:
--   1. Create unique index on lower(image_hash) for active (non-rejected) reports
--      to atomically prevent duplicate image submissions across all citizens.
--   2. Add trigger prevent_duplicate_image_report to reject duplicate image submissions
--      with error code 23505 and HINT 'DUPLICATE_IMAGE_HASH'.
--   3. Ensure check_image_duplicate RPC normalizes input and uses indexed lookup.
-- =============================================================================

-- ── 1. UNIQUE INDEX FOR CONCURRENCY PROTECTION ───────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_image_reports_image_hash
    ON public.image_reports (lower(image_hash))
    WHERE image_hash IS NOT NULL AND status != 'rejected';

-- ── 2. TRIGGER TO PREVENT DUPLICATE IMAGE INSERTION / UPDATE ─────────────────
CREATE OR REPLACE FUNCTION public.prevent_duplicate_image_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    IF NEW.image_hash IS NOT NULL AND length(trim(NEW.image_hash)) >= 16 THEN
        -- Normalize hash to lowercase
        NEW.image_hash := lower(trim(NEW.image_hash));

        -- Check if an active (non-rejected) report already exists with this hash
        SELECT id INTO v_existing_id
        FROM public.image_reports
        WHERE lower(image_hash) = NEW.image_hash
          AND status != 'rejected'
          AND (TG_OP = 'INSERT' OR id != NEW.id)
        LIMIT 1;

        IF FOUND THEN
            RAISE EXCEPTION 'Incident Already Reported: This exact image has already been submitted (existing report: %)', v_existing_id
                USING ERRCODE = '23505',
                      HINT = 'DUPLICATE_IMAGE_HASH';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_image ON public.image_reports;
CREATE TRIGGER trg_prevent_duplicate_image
    BEFORE INSERT OR UPDATE OF image_hash, status ON public.image_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_duplicate_image_report();

-- ── 3. REFINED SECURITY DEFINER RPC: check_image_duplicate ────────────────────
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
    WHERE lower(image_hash) = lower(trim(p_hash))
      AND status != 'rejected'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_image_duplicate(TEXT) TO authenticated, anon;
