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
    v_caller_id     UUID;
    v_caller_role   TEXT;
    v_report        RECORD;
    v_review_id     UUID;
    v_reward        INTEGER := 0;
    v_notif_title   TEXT;
    v_notif_body    TEXT;
BEGIN
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %. Must be approved or rejected.', p_decision
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        v_caller_id := p_officer_id;
    END IF;

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only verified traffic officers can review reports.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_report
    FROM public.image_reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success',          false,
            'already_reviewed', true,
            'current_status',   v_report.status,
            'message',          'Report has already been reviewed. No changes made.'
        );
    END IF;

    PERFORM set_config('traffic_eye.allow_profile_update', 'on', true);

    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, v_caller_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision         = EXCLUDED.decision,
            remarks          = EXCLUDED.remarks,
            internal_notes   = EXCLUDED.internal_notes,
            review_timestamp = now(),
            officer_id       = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    IF p_decision = 'approved' THEN
        CASE lower(COALESCE(v_report.severity, 'medium'))
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 70;
            WHEN 'high'     THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE                 v_reward := 50;
        END CASE;
    ELSE
        v_reward := 0;
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

    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been approved! You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected.');
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
        'success',          true,
        'already_reviewed', false,
        'review_id',        v_review_id,
        'decision',         p_decision,
        'reward_amount',    v_reward
    );
END;
$$;
