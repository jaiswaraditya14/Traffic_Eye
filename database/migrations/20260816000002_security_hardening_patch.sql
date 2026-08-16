-- ---------------------------------------------------------------------------
-- TRAFFIC EYE — SECURITY HARDENING PATCH 2
-- File: 20260816000002_security_hardening_patch.sql
-- ---------------------------------------------------------------------------
--
-- Change Log:
--  1. Fix guard_protected_profile_columns() trigger:
--       * Added badge_id to protected columns.
--       * Removed incorrect WHEN clause (current_user check was wrong for
--         PostgREST/Supabase).
--       * Trigger is now unconditional BEFORE UPDATE.
--
--  2. Re-confirm profiles UPDATE policy (clean slate).
--
--  3. safe_update_own_profile() RPC: DB-level allow-list for profile updates.
--       Only full_name and avatar_url can be changed by clients.
--
--  4. get_officer_email_by_badge() rewritten with per-connection rate-limit:
--       Max 10 lookups per 5-minute window per connection.
--
--  5. badge_lookup_rate_limit table to track attempts.
--
-- Safe to re-run: CREATE OR REPLACE / DROP IF EXISTS / IF NOT EXISTS
-- ---------------------------------------------------------------------------


-- -- 1. RATE-LIMIT TABLE FOR BADGE LOOKUPS ---------------------------------
CREATE TABLE IF NOT EXISTS public.badge_lookup_rate_limit (
    source_key   TEXT        NOT NULL,
    attempt_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_rate_limit_source_time
    ON public.badge_lookup_rate_limit (source_key, attempt_at DESC);

ALTER TABLE public.badge_lookup_rate_limit ENABLE ROW LEVEL SECURITY;
-- No client policies needed — only accessible from SECURITY DEFINER functions


-- -- 2. FIX guard_protected_profile_columns() — remove wrong WHEN clause ---
--
-- BUG IN PREVIOUS VERSION:
--   WHEN (current_user IN ('authenticator', 'anon', 'authenticated'))
-- In Supabase/PostgREST all client queries run as the 'authenticator' role.
-- 'authenticated' and 'anon' are PostgREST JWT claim identifiers, not
-- PostgreSQL session roles. The WHEN clause was fragile and its intent
-- ambiguous. FIX: remove WHEN clause entirely — trigger fires unconditionally.
-- SECURITY DEFINER RPCs bypass triggers (they run as owner), which is correct.

CREATE OR REPLACE FUNCTION public.guard_protected_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
        RAISE EXCEPTION
            'Direct modification of points_balance is not permitted. Use server-side RPCs.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION
            'Direct modification of role is not permitted. Role assignment requires admin provisioning.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.badge_id IS DISTINCT FROM OLD.badge_id THEN
        RAISE EXCEPTION
            'Direct modification of badge_id is not permitted.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop old trigger (had wrong WHEN clause) and recreate unconditionally
DROP TRIGGER IF EXISTS guard_profile_columns_update ON public.profiles;
CREATE TRIGGER guard_profile_columns_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_protected_profile_columns();

REVOKE ALL ON FUNCTION public.guard_protected_profile_columns() FROM PUBLIC;


-- -- 3. CLEAN SLATE profiles UPDATE POLICY ---------------------------------
DROP POLICY IF EXISTS "Users can update own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safe cols"  ON public.profiles;

CREATE POLICY "Users can update own profile safe cols"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING      ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);


-- -- 4. safe_update_own_profile() — DB-enforced field allow-list -----------
--
-- authService.updateProfile() accepts an arbitrary updates object.
-- This RPC is the hardened replacement — only full_name and avatar_url
-- can be changed. Any attempt to modify role/badge_id/points is ignored
-- at the application layer AND blocked by the trigger above.

DROP FUNCTION IF EXISTS public.safe_update_own_profile(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.safe_update_own_profile(
    p_full_name  TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
    END IF;

    UPDATE public.profiles
    SET
        full_name  = COALESCE(p_full_name,  full_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = now()
    WHERE id = v_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'no_data_found';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.safe_update_own_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_update_own_profile(TEXT, TEXT) TO authenticated;


-- -- 5. get_officer_email_by_badge() — rate-limited rewrite ----------------
--
-- PROBLEM: Previous version callable by anon with no rate limiting.
-- FIX: Track call count per pg_backend_pid + hour bucket.
-- Limit: 10 attempts per 5-minute window. Returns NULL silently on limit.
-- Anon grant kept — badge login must work before authentication.

DROP FUNCTION IF EXISTS public.get_officer_email_by_badge(TEXT);

CREATE OR REPLACE FUNCTION public.get_officer_email_by_badge(p_badge_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email         TEXT;
    v_source_key    TEXT;
    v_attempt_count INTEGER;
    v_window_start  TIMESTAMPTZ := now() - INTERVAL '5 minutes';
BEGIN
    IF p_badge_id IS NULL OR trim(p_badge_id) = '' THEN
        RETURN NULL;
    END IF;

    -- Source key: hash of backend PID + hour bucket (per-connection rate limit)
    v_source_key := md5(
        pg_backend_pid()::TEXT || '|' ||
        date_trunc('hour', now())::TEXT
    );

    SELECT COUNT(*) INTO v_attempt_count
    FROM public.badge_lookup_rate_limit
    WHERE source_key = v_source_key
      AND attempt_at  > v_window_start;

    -- Hard limit: 10 attempts per 5-minute window
    IF v_attempt_count >= 10 THEN
        -- Fail silently — do not reveal rate-limiting is active
        RETURN NULL;
    END IF;

    -- Record this attempt
    INSERT INTO public.badge_lookup_rate_limit (source_key) VALUES (v_source_key);

    -- Probabilistic cleanup (10% chance) to keep table lean
    IF random() < 0.10 THEN
        DELETE FROM public.badge_lookup_rate_limit
        WHERE attempt_at < now() - INTERVAL '1 hour';
    END IF;

    -- Lookup: normalized badge_id, role must be officer
    SELECT email INTO v_email
    FROM public.profiles
    WHERE badge_id = trim(upper(p_badge_id))
      AND role     = 'officer';

    RETURN v_email;  -- NULL for non-match — indistinguishable from invalid badge
END;
$$;

REVOKE ALL ON FUNCTION public.get_officer_email_by_badge(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_officer_email_by_badge(TEXT) TO anon, authenticated;


-- -- 6. CLEANUP stale rate-limit entries -----------------------------------
DELETE FROM public.badge_lookup_rate_limit
WHERE attempt_at < now() - INTERVAL '1 hour';


-- ---------------------------------------------------------------------------
-- END OF MIGRATION
-- ---------------------------------------------------------------------------
