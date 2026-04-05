-- ============================================================
-- TRAFFIC_EYE — IMAGE REPORT FEATURE SCHEMA
-- Run this in the Supabase SQL editor (after auth_setup_fixed.sql)
-- ============================================================

-- ── 1. IMAGE REPORTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_reports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Media
    image_url           TEXT NOT NULL,
    image_storage_path  TEXT,                          -- path inside Supabase Storage bucket

    -- Location
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    location_address    TEXT,

    -- AI Analysis results
    violation_type      TEXT,
    violation_description TEXT,
    severity            TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ai_confidence       NUMERIC(5,4),                  -- 0.0000 – 1.0000
    ai_raw_result       JSONB,                         -- full Gemini response blob
    vehicle_number      TEXT,

    -- Workflow status
    -- pending  → AI analyzed, awaiting officer
    -- approved → officer approved
    -- rejected → officer rejected
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Timestamps
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ,

    -- Soft-delete / archival
    is_archived         BOOLEAN DEFAULT FALSE
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_image_reports_user_id   ON image_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_status    ON image_reports(status);
CREATE INDEX IF NOT EXISTS idx_image_reports_submitted ON image_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_reports_severity  ON image_reports(severity);

-- ── 2. OFFICER REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS officer_reviews (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id        UUID NOT NULL REFERENCES image_reports(id) ON DELETE CASCADE,
    officer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    decision         TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    remarks          TEXT,                             -- public remark shown to user
    internal_notes   TEXT,                             -- private notes, only for officers

    review_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (report_id)                                 -- one review per report
);

CREATE INDEX IF NOT EXISTS idx_officer_reviews_report   ON officer_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_officer  ON officer_reviews(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_decision ON officer_reviews(decision);

-- ── 3. NOTIFICATIONS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('report_approved', 'report_rejected', 'points_earned', 'system')),
    reference_id UUID,                                 -- e.g. report id this notification is about
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ── 4. ROW-LEVEL SECURITY ───────────────────────────────────

-- image_reports
ALTER TABLE image_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens view own reports"        ON image_reports;
DROP POLICY IF EXISTS "Citizens insert own reports"      ON image_reports;
DROP POLICY IF EXISTS "Officers view all pending reports" ON image_reports;
DROP POLICY IF EXISTS "Officers update report status"    ON image_reports;
DROP POLICY IF EXISTS "System update report status"      ON image_reports;

-- Citizens can only see their own rows
CREATE POLICY "Citizens view own reports" ON image_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Citizens can submit reports
CREATE POLICY "Citizens insert own reports" ON image_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Officers can read all reports
CREATE POLICY "Officers view all pending reports" ON image_reports
    FOR SELECT USING (is_officer());

-- Officers (and system functions via SECURITY DEFINER) can update status
CREATE POLICY "Officers update report status" ON image_reports
    FOR UPDATE USING (is_officer());

-- officer_reviews
ALTER TABLE officer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers insert reviews"  ON officer_reviews;
DROP POLICY IF EXISTS "Officers view own reviews" ON officer_reviews;
DROP POLICY IF EXISTS "Citizens view reviews on own reports" ON officer_reviews;

CREATE POLICY "Officers insert reviews" ON officer_reviews
    FOR INSERT WITH CHECK (is_officer() AND auth.uid() = officer_id);

CREATE POLICY "Officers view own reviews" ON officer_reviews
    FOR SELECT USING (is_officer());

-- Citizens can read the review for their own reports
CREATE POLICY "Citizens view reviews on own reports" ON officer_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM image_reports
            WHERE image_reports.id = officer_reviews.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "System insert notifications"  ON notifications;
DROP POLICY IF EXISTS "Users mark own as read"       ON notifications;

CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);   -- called from SECURITY DEFINER functions

CREATE POLICY "Users mark own as read" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ── 5. FUNCTION: OFFICER SUBMITS REVIEW ─────────────────────
-- Atomically: inserts officer_reviews, updates image_reports.status,
--             awards points if approved, and fires a notification.
CREATE OR REPLACE FUNCTION submit_officer_review(
    p_report_id    UUID,
    p_officer_id   UUID,
    p_decision     TEXT,      -- 'approved' | 'rejected'
    p_remarks      TEXT DEFAULT NULL,
    p_internal     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report        RECORD;
    v_review_id     UUID;
    v_points_ok     BOOLEAN;
    v_notif_title   TEXT;
    v_notif_body    TEXT;
BEGIN
    -- Validate decision
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %', p_decision;
    END IF;

    -- Load report (confirms it exists)
    SELECT * INTO v_report FROM image_reports WHERE id = p_report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id;
    END IF;

    -- Insert review
    INSERT INTO officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, p_officer_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision         = EXCLUDED.decision,
            remarks          = EXCLUDED.remarks,
            internal_notes   = EXCLUDED.internal_notes,
            review_timestamp = NOW(),
            officer_id       = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    -- Update report status & reviewed_at
    UPDATE image_reports
    SET status      = p_decision,
        reviewed_at = NOW()
    WHERE id = p_report_id;

    -- Award points if approved
    IF p_decision = 'approved' THEN
        SELECT award_points(v_report.user_id, 'report_verified', p_report_id) INTO v_points_ok;
    END IF;

    -- Notification content
    IF p_decision = 'approved' THEN
        v_notif_title := '✅ Report Approved!';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been reviewed and approved by an officer.');
    ELSE
        v_notif_title := '❌ Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected. Please check the details.');
    END IF;

    -- Fire notification to citizen
    INSERT INTO notifications (user_id, title, body, type, reference_id)
    VALUES (v_report.user_id, v_notif_title, v_notif_body,
            CASE p_decision WHEN 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
            p_report_id);

    RETURN jsonb_build_object(
        'success',    true,
        'review_id',  v_review_id,
        'decision',   p_decision
    );
END;
$$;

-- Realtime — enable for all three tables
ALTER publication supabase_realtime ADD TABLE image_reports;
ALTER publication supabase_realtime ADD TABLE officer_reviews;
ALTER publication supabase_realtime ADD TABLE notifications;

-- ── Done ─────────────────────────────────────────────────────
