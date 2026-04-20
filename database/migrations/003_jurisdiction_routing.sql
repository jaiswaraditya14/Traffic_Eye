-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003: Jurisdiction-Based Report Routing
-- ═══════════════════════════════════════════════════════════════════════════════
-- Safe to re-run — uses IF NOT EXISTS / idempotent patterns
-- Generated: 2026-04-20
--
-- What this migration does:
--   1. Enables pg_trgm extension (for fast ILIKE text search)
--   2. Adds GIN index on location_address for pincode/keyword matching
--   3. Adds partial index on profiles.jurisdiction
--
-- Convention:
--   Badge ID "EYE-055" → Pincode "400055" (Vakola)
--   Badge ID "EYE-071" → Pincode "400071" (Chembur)
--   App searches: location_address ILIKE '%400055%' OR ILIKE '%Vakola%'
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Enable pg_trgm extension ─────────────────────────────────────────────
--    Required for gin_trgm_ops index operator class.
--    Without this, ILIKE '%keyword%' queries do a full table scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ── 2. GIN index on location_address for fast ILIKE searches ────────────────
--    This allows the DB to use an index for queries like:
--      WHERE location_address ILIKE '%400055%' OR location_address ILIKE '%Vakola%'
CREATE INDEX IF NOT EXISTS idx_image_reports_location_address
    ON public.image_reports USING gin (location_address gin_trgm_ops);


-- ── 3. Partial index on profiles.jurisdiction ───────────────────────────────
--    Speeds up lookups of officers who have a jurisdiction assigned.
CREATE INDEX IF NOT EXISTS idx_profiles_jurisdiction
    ON public.profiles(jurisdiction)
    WHERE jurisdiction IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Paste this into Supabase Dashboard > SQL Editor > Run
-- ═══════════════════════════════════════════════════════════════════════════════
