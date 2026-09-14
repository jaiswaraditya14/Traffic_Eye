-- ═══════════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — FULL DATA RESET FOR RETESTING
-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ TRUNCATE only — no DROP, no DELETE
-- ✅ Schema, RLS, functions, triggers all stay 100% intact
-- ✅ Auth users and profiles preserved
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── STEP 1: Temporarily disable the guard trigger so we can reset points ───
-- The guard_protected_profile_columns() trigger blocks direct points_balance
-- updates even in the SQL editor. We disable it just for this reset, then
-- immediately re-enable it below.
ALTER TABLE public.profiles DISABLE TRIGGER guard_profile_columns_update;


-- ── STEP 2: Reset cached points balance on all profiles ────────────────────
UPDATE public.profiles SET points_balance = 0;


-- ── STEP 3: Re-enable the guard trigger immediately ────────────────────────
ALTER TABLE public.profiles ENABLE TRIGGER guard_profile_columns_update;


-- ── REWARDS & POINTS ───────────────────────────────────────────────────────
TRUNCATE TABLE public.point_transactions RESTART IDENTITY CASCADE;


-- ── STORAGE ────────────────────────────────────────────────────────────────
-- Clears all file metadata; bucket definitions stay intact
TRUNCATE TABLE storage.objects RESTART IDENTITY CASCADE;


-- ── REPORTS (USER) ─────────────────────────────────────────────────────────
TRUNCATE TABLE public.verification_images RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.verification_reports RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.image_reports RESTART IDENTITY CASCADE;


-- ── REPORTS (OFFICER) ──────────────────────────────────────────────────────
TRUNCATE TABLE public.officer_reviews RESTART IDENTITY CASCADE;


-- ── RELATED CLEANUP ────────────────────────────────────────────────────────
TRUNCATE TABLE public.notifications RESTART IDENTITY CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! App is reset and ready for fresh testing.
-- ═══════════════════════════════════════════════════════════════════════════════
