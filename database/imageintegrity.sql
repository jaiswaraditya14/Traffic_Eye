-- ═══════════════════════════════════════════════════════════════════════════
-- Traffic Eye — Image Integrity Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add image_hash column for Stage 0A duplicate detection
-- This stores the SHA-256 fingerprint of the 8×8 normalised thumbnail.
ALTER TABLE image_reports
    ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT NULL;

-- Step 2: Create a fast index on image_hash for O(log n) exact-match lookups
-- The partial index only covers non-null hashes to minimise index size.
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash
    ON image_reports (image_hash)
    WHERE image_hash IS NOT NULL;

-- Step 3: Add authenticity_check JSONB column for audit trail
-- Stores the Stage 0B Gemini authenticity result alongside each report.
-- Useful for officer review and fraud investigation.
ALTER TABLE image_reports
    ADD COLUMN IF NOT EXISTS authenticity_check JSONB DEFAULT NULL;

-- ─── Verification ────────────────────────────────────────────────────────────
-- Run this SELECT to confirm columns were added:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'image_reports'
  AND column_name IN ('image_hash', 'authenticity_check')
ORDER BY column_name;

