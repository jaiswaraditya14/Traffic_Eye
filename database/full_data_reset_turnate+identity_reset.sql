-- ═══════════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — FULL DATA RESET FOR RETESTING
-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ TRUNCATE only — no DROP, no DELETE
-- ✅ Schema, RLS, functions, triggers all stay 100% intact
-- ✅ Auth users and profiles preserved
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── REWARDS & POINTS ───────────────────────────────────────────────────────
TRUNCATE TABLE public.point_transactions RESTART IDENTITY CASCADE;

-- Reset cached points balance on all profiles (keeps profile rows intact)
UPDATE public.profiles SET points_balance = 0;


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
-- DONE! App is reset and ready for testing.
-- ═══════════════════════════════════════════════════════════════════════════════
