-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 001: Add report_media table + reward_amount column
-- ═══════════════════════════════════════════════════════════════════════════════
-- Safe to re-run — uses IF NOT EXISTS / safe ALTER patterns
-- Generated: 2026-04-12
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. Add reward_amount column to image_reports ────────────────────────────
ALTER TABLE public.image_reports
    ADD COLUMN IF NOT EXISTS reward_amount INTEGER NOT NULL DEFAULT 0;


-- ── 2. Create report_media table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_media (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id        UUID NOT NULL REFERENCES public.image_reports(id) ON DELETE CASCADE,
    file_url         TEXT NOT NULL,
    file_type        TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    storage_path     TEXT,
    file_name        TEXT,
    mime_type        TEXT,
    file_size        INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── 3. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_report_media_report  ON public.report_media(report_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_reward ON public.image_reports(reward_amount);


-- ── 4. Enable RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;


-- ── 5. RLS Policies ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Citizens view own report media"    ON public.report_media;
DROP POLICY IF EXISTS "Citizens insert own report media"  ON public.report_media;
DROP POLICY IF EXISTS "Officers view all report media"    ON public.report_media;

-- Citizens can view media linked to their own reports
CREATE POLICY "Citizens view own report media"
    ON public.report_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.image_reports
            WHERE image_reports.id = report_media.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

-- Citizens can insert media into their own reports
CREATE POLICY "Citizens insert own report media"
    ON public.report_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.image_reports
            WHERE image_reports.id = report_media.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

-- Officers can view all report media
CREATE POLICY "Officers view all report media"
    ON public.report_media FOR SELECT
    USING (is_officer());


-- ── 6. Add report_media to Realtime ─────────────────────────────────────────
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_media;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 7. Storage bucket for report media (images + videos) ───────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-media',
    'report-media',
    true,
    52428800,   -- 50 MB (for videos)
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for report-media bucket
DROP POLICY IF EXISTS "Users can upload report media"    ON storage.objects;
DROP POLICY IF EXISTS "Public can view report media"     ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report media" ON storage.objects;

CREATE POLICY "Users can upload report media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'report-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Public can view report media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'report-media');

CREATE POLICY "Users can delete own report media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'report-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );


-- ── 8. Updated submit_officer_review() with severity-based reward ──────────
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
    -- Validate decision
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %', p_decision;
    END IF;

    -- Load report (confirms it exists)
    SELECT * INTO v_report FROM public.image_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    -- Insert or update review (one review per report)
    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, p_officer_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision         = EXCLUDED.decision,
            remarks          = EXCLUDED.remarks,
            internal_notes   = EXCLUDED.internal_notes,
            review_timestamp = now(),
            officer_id       = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    -- Compute severity-based reward (only on approval)
    IF p_decision = 'approved' THEN
        CASE v_report.severity
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 70;
            WHEN 'high'     THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE                  v_reward := 50;
        END CASE;
    END IF;

    -- Update report status, reviewed_at, and reward_amount
    UPDATE public.image_reports
    SET status        = p_decision,
        reviewed_at   = now(),
        reward_amount = v_reward
    WHERE id = p_report_id;

    -- Credit user's points balance on approval
    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        -- Record the transaction
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

    -- Build notification content
    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been approved! You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected. Please check the details.');
    END IF;

    -- Send notification to citizen
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Migration applied.
-- ═══════════════════════════════════════════════════════════════════════════════
