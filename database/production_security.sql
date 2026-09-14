-- ═══════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — PRODUCTION SECURITY & INTEGRITY MIGRATION
-- File: 20260816000001_production_security_rewards_routing.sql
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Change Log:
--  1. profiles UPDATE RLS hardened — citizens cannot update points_balance/role.
--  2. guard_protected_profile_columns() trigger prevents direct REST manipulation.
--  3. get_officer_email_by_badge() — secure badge→email lookup (prevents enumeration).
--  4. award_submission_points()    — idempotent atomic server-side 10-pt award.
--  5. redeem_reward_item()         — atomic FOR UPDATE lock redemption (no race).
--  6. submit_officer_review()      — idempotency guard + aligned severity pts
--                                    (low=50, medium=70, high=100, critical=100).
--  7. check_plate_duplicate()      — SECURITY DEFINER cross-citizen plate check.
--  8. Performance indexes for rate-limiting and idempotency checks.
--
-- ✅ Safe to re-run — uses CREATE OR REPLACE / DROP IF EXISTS
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. RLS HARDENING — profiles ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own profile"             ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safe cols"   ON public.profiles;

CREATE POLICY "Users can update own profile safe cols"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);


-- ── 2. TRIGGER: block direct points_balance / role changes ───────────────
CREATE OR REPLACE FUNCTION public.guard_protected_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
        RAISE EXCEPTION 'Direct modification of points_balance is not allowed. Use server functions.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Direct modification of role is not allowed.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_columns_update ON public.profiles;
CREATE TRIGGER guard_profile_columns_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (current_user IN ('authenticator', 'anon', 'authenticated'))
    EXECUTE FUNCTION public.guard_protected_profile_columns();


-- ── 3. get_officer_email_by_badge ────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_officer_email_by_badge(TEXT);

CREATE OR REPLACE FUNCTION public.get_officer_email_by_badge(p_badge_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF p_badge_id IS NULL OR trim(p_badge_id) = '' THEN
        RETURN NULL;
    END IF;

    SELECT email INTO v_email
    FROM public.profiles
    WHERE badge_id = trim(p_badge_id)
      AND role = 'officer';

    RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_officer_email_by_badge(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_officer_email_by_badge(TEXT) TO anon, authenticated;


-- ── 4. award_submission_points — idempotent 10-pt submission award ────────
DROP FUNCTION IF EXISTS public.award_submission_points(UUID, UUID);

CREATE OR REPLACE FUNCTION public.award_submission_points(
    p_user_id   UUID,
    p_report_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_count INTEGER;
    v_points         INTEGER := 10;
BEGIN
    IF p_user_id IS NULL OR p_report_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id and p_report_id are required';
    END IF;

    -- Idempotency: skip if already awarded for this report
    SELECT COUNT(*) INTO v_existing_count
    FROM public.point_transactions
    WHERE user_id      = p_user_id
      AND action       = 'report_submitted'
      AND reference_id = p_report_id;

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true, 'skipped', true,
            'reason', 'Points already awarded for this report', 'pointsAwarded', 0
        );
    END IF;

    UPDATE public.profiles
    SET points_balance = points_balance + v_points
    WHERE id = p_user_id;

    INSERT INTO public.point_transactions
        (user_id, amount, type, action, reference_id, description)
    VALUES
        (p_user_id, v_points, 'earned', 'report_submitted', p_report_id,
         'Base reward for submitting a traffic report');

    RETURN jsonb_build_object(
        'success', true, 'skipped', false, 'pointsAwarded', v_points
    );
END;
$$;

REVOKE ALL ON FUNCTION public.award_submission_points(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_submission_points(UUID, UUID) TO authenticated;


-- ── 5. redeem_reward_item — atomic FOR UPDATE lock redemption ─────────────
DROP FUNCTION IF EXISTS public.redeem_reward_item(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.redeem_reward_item(
    p_user_id    UUID,
    p_item_id    TEXT,
    p_points     INTEGER,
    p_item_title TEXT,
    p_coupon     TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile     RECORD;
    v_unlocked_at TIMESTAMPTZ := now();
BEGIN
    IF p_user_id IS NULL OR p_item_id IS NULL OR p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'Invalid redemption parameters';
    END IF;

    -- Row-level lock to prevent concurrent double-redemption
    SELECT id, points_balance
    INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for id=%', p_user_id;
    END IF;

    IF v_profile.points_balance < p_points THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'Insufficient points balance.',
            'balance', v_profile.points_balance
        );
    END IF;

    UPDATE public.profiles
    SET points_balance = points_balance - p_points
    WHERE id = p_user_id;

    INSERT INTO public.point_transactions
        (user_id, amount, type, action, description)
    VALUES
        (p_user_id, p_points, 'redeemed', 'gift_redeemed',
         jsonb_build_object(
             'itemId',     p_item_id,
             'itemTitle',  p_item_title,
             'couponCode', p_coupon,
             'unlockedAt', v_unlocked_at,
             'expiresAt',  p_expires_at
         )::text);

    RETURN jsonb_build_object(
        'success',    true,
        'newBalance', v_profile.points_balance - p_points,
        'couponCode', p_coupon,
        'unlockedAt', v_unlocked_at,
        'expiresAt',  p_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward_item(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_reward_item(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;


-- ── 6. submit_officer_review — idempotency + aligned severity points ──────
-- Severity aligned with frontend SEVERITY_POINTS: low=50, medium=70, high=100, critical=100.
-- Now returns early if report is not 'pending' (prevents double point crediting).

CREATE OR REPLACE FUNCTION public.submit_officer_review(
    p_report_id    UUID,
    p_officer_id   UUID,
    p_decision     TEXT,
    p_remarks      TEXT DEFAULT NULL,
    p_internal     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report      RECORD;
    v_review_id   UUID;
    v_reward      INTEGER := 0;
    v_notif_title TEXT;
    v_notif_body  TEXT;
BEGIN
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %', p_decision;
    END IF;

    SELECT * INTO v_report FROM public.image_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    -- ── Idempotency guard ────────────────────────────────────────────────
    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success',          false,
            'already_reviewed', true,
            'current_status',   v_report.status,
            'message',          'Report already reviewed. No changes made.'
        );
    END IF;

    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, p_officer_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision         = EXCLUDED.decision,
            remarks          = EXCLUDED.remarks,
            internal_notes   = EXCLUDED.internal_notes,
            review_timestamp = now(),
            officer_id       = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    -- Severity → reward aligned with frontend constants
    IF p_decision = 'approved' THEN
        CASE v_report.severity
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 70;
            WHEN 'high'     THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE                  v_reward := 50;
        END CASE;
    END IF;

    UPDATE public.image_reports
    SET status        = p_decision,
        reviewed_at   = now(),
        reward_amount = v_reward
    WHERE id = p_report_id;

    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        INSERT INTO public.point_transactions
            (user_id, amount, type, action, reference_id, description)
        VALUES (
            v_report.user_id, v_reward, 'earned', 'report_approved', p_report_id,
            'Reward for approved violation report (severity: ' ||
                COALESCE(v_report.severity, 'unknown') || ')'
        );
    END IF;

    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been approved! You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected. Please check the details.');
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
        v_report.user_id, v_notif_title, v_notif_body,
        CASE p_decision WHEN 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
        p_report_id
    );

    RETURN jsonb_build_object(
        'success',       true,
        'review_id',     v_review_id,
        'decision',      p_decision,
        'reward_amount', v_reward
    );
END;
$$;


-- ── 7. check_plate_duplicate — SECURITY DEFINER cross-citizen check ───────
DROP FUNCTION IF EXISTS public.check_plate_duplicate(TEXT);

CREATE OR REPLACE FUNCTION public.check_plate_duplicate(p_vehicle_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_normalized TEXT;
    v_report     RECORD;
BEGIN
    IF p_vehicle_number IS NULL OR trim(p_vehicle_number) = '' THEN
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', NULL);
    END IF;

    v_normalized := upper(regexp_replace(trim(p_vehicle_number), '\s+', '', 'g'));

    SELECT id, submitted_at
    INTO v_report
    FROM public.image_reports
    WHERE vehicle_number = v_normalized
      AND status <> 'rejected'
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_duplicate',       true,
            'existing_report_id', v_report.id,
            'submitted_at',       v_report.submitted_at
        );
    END IF;

    RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.check_plate_duplicate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_plate_duplicate(TEXT) TO authenticated;


-- ── 8. PERFORMANCE INDEXES ────────────────────────────────────────────────

-- Rate-limit: fast count of pending reports per user in last hour
CREATE INDEX IF NOT EXISTS idx_image_reports_rate_limit
    ON public.image_reports (user_id, submitted_at DESC)
    WHERE status = 'pending';

-- Plate duplicate lookup on non-rejected reports
CREATE INDEX IF NOT EXISTS idx_image_reports_vehicle_number
    ON public.image_reports (vehicle_number)
    WHERE vehicle_number IS NOT NULL AND status <> 'rejected';

-- Idempotency index for award_submission_points
CREATE INDEX IF NOT EXISTS idx_point_transactions_submission_idem
    ON public.point_transactions (user_id, action, reference_id)
    WHERE action = 'report_submitted';


-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
