-- ═══════════════════════════════════════════════════════════════════════════
-- Traffic Eye — Cross-User Duplicate Detection & Integrity Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ensure image_hash column exists
ALTER TABLE image_reports
    ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT NULL;

-- 2. Ensure authenticity_check column exists
ALTER TABLE image_reports
    ADD COLUMN IF NOT EXISTS authenticity_check JSONB DEFAULT NULL;

-- 3. Create index for O(1) hash lookup
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash
    ON image_reports (image_hash)
    WHERE image_hash IS NOT NULL;

-- 4. Create SECURITY DEFINER RPC function for cross-user duplicate check
-- Why SECURITY DEFINER?
-- RLS (Row Level Security) restricts citizens to seeing ONLY their own reports.
-- This function allows the backend to check if an image hash exists across ALL
-- citizens' submitted reports without exposing any personal data.
CREATE OR REPLACE FUNCTION check_image_duplicate(p_hash TEXT)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_report_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_hash IS NULL OR trim(p_hash) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE, id
    FROM image_reports
    WHERE image_hash = p_hash
      AND status != 'rejected'  -- Rejected reports do not block re-submission
    LIMIT 1;

    -- If no row found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

-- Grant execution permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION check_image_duplicate(TEXT) TO authenticated, anon;

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run this test query:
SELECT * FROM check_image_duplicate('test_hash_sample');

