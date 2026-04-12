-- ============================================================
-- Traffic Eye — Patch Migration
-- Run this in Supabase SQL Editor to fix Bug 3
-- (record "new" has no field "updated_at")
-- ============================================================

-- 1. Add updated_at to image_reports if it was missing
--    (The trigger_set_updated_at() trigger requires this column)
ALTER TABLE public.image_reports
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Re-create the trigger to keep updated_at in sync on every UPDATE
DROP TRIGGER IF EXISTS image_reports_updated_at ON public.image_reports;
CREATE TRIGGER image_reports_updated_at
    BEFORE UPDATE ON public.image_reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 3. Re-affirm the reward values in submit_officer_review()
--    to match:  low=50  medium=100  high=200  critical=200
--    (These are already correct in schema — this just re-runs cleanly)
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
    v_report        RECORD;
    v_review_id     UUID;
    v_reward        INTEGER := 0;
    v_notif_title   TEXT;
    v_notif_body    TEXT;
BEGIN
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %', p_decision;
    END IF;

    SELECT * INTO v_report FROM public.image_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
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

    -- Severity-based reward — only on approval, 0 on rejection
    IF p_decision = 'approved' THEN
        CASE v_report.severity
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 100;
            WHEN 'high'     THEN v_reward := 200;
            WHEN 'critical' THEN v_reward := 200;
            ELSE                  v_reward := 50;
        END CASE;
    END IF;

    -- Update report status and reward_amount
    UPDATE public.image_reports
    SET status        = p_decision,
        reviewed_at   = now(),
        reward_amount = v_reward
    WHERE id = p_report_id;

    -- Credit citizen's points on approval only
    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        INSERT INTO public.point_transactions (user_id, amount, type, action, reference_id, description)
        VALUES (
            v_report.user_id,
            v_reward,
            'earned',
            'report_approved',
            p_report_id,
            'Reward for approved violation report (severity: ' || COALESCE(v_report.severity, 'unknown') || ')'
        );
    END IF;

    -- Notification
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
        v_report.user_id,
        v_notif_title,
        v_notif_body,
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

-- 4. (Optional cleanup) Zero out any incorrect submission points that
--    were awarded before this patch if you ran the previous code.
--    Only run this if you want to reset incorrectly awarded points.
-- UPDATE public.profiles p
--     SET points_balance = GREATEST(0, p.points_balance - (
--         SELECT COALESCE(SUM(pt.amount), 0)
--         FROM public.point_transactions pt
--         WHERE pt.user_id = p.id AND pt.action = 'report_submitted'
--     ))
--     WHERE EXISTS (
--         SELECT 1 FROM public.point_transactions
--         WHERE user_id = p.id AND action = 'report_submitted'
--     );
-- DELETE FROM public.point_transactions WHERE action = 'report_submitted';
