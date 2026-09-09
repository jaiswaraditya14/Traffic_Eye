-- ═══════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — BASELINE BOOTSTRAP (reproduces the already-deployed schema)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
--   This file exists so `supabase db reset` can rebuild the exact schema that
--   is ALREADY LIVE on the hosted project, before any repair migration runs.
--   It is a faithful consolidation of what was previously applied by hand
--   through the Supabase SQL Editor:
--
--     database/Traffic_eye_database.sql          (canonical bootstrap)
--     database/crossuser_duplication.sql         (image_hash + check_image_duplicate)
--     database/imageintegrity.sql                (integrity columns)
--     database/heatmap.sql                       (heatmap policy + RPC)
--     database/index and rsl.sql                 (extra indexes/policies)
--     database/juridication_routing.sql          (trigram indexes)
--     database/patch update for images and reward.sql (report_media + bucket)
--     database/phash.sql                         (check_image_duplicate)
--
--   It deliberately reproduces the INSECURE pre-repair state, including the
--   known vulnerabilities, so that the repair migration can be tested against
--   a realistic starting point and so the pgTAP suite can prove each hole is
--   actually closed. Do NOT read this file as a statement of intent.
--
--   Fixed relative to database/Traffic_eye_database.sql: that file contains an
--   orphaned statement block after submit_officer_review()'s terminating `$$;`
--   (lines 711-728) which makes it fail to parse. The dead block is omitted.
--
--   Everything is idempotent, so applying it to the live project is a no-op.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. EXTENSIONS ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ── 2. TABLES ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            TEXT NOT NULL,
    full_name        TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    role             TEXT NOT NULL DEFAULT 'citizen'
                         CHECK (role IN ('citizen', 'officer')),
    avatar_url       TEXT,
    points_balance   INTEGER NOT NULL DEFAULT 0,
    badge_id         TEXT UNIQUE,
    jurisdiction     TEXT,
    department       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.point_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type      TEXT UNIQUE NOT NULL,
    points           INTEGER NOT NULL,
    description      TEXT,
    is_one_time      BOOLEAN NOT NULL DEFAULT false,
    is_active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.point_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount           INTEGER NOT NULL,
    type             TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus')),
    action           TEXT NOT NULL,
    reference_id     UUID,
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.image_reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url             TEXT NOT NULL,
    image_storage_path    TEXT,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    location_address      TEXT,
    violation_type        TEXT,
    violation_description TEXT,
    severity              TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ai_confidence         NUMERIC(5,4),
    ai_raw_result         JSONB,
    vehicle_number        TEXT,
    status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
    reward_amount         INTEGER NOT NULL DEFAULT 0,
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_archived           BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS reward_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- from database/crossuser_duplication.sql + database/imageintegrity.sql
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS image_hash TEXT DEFAULT NULL;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS authenticity_check JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.officer_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id         UUID NOT NULL REFERENCES public.image_reports(id) ON DELETE CASCADE,
    officer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision          TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    remarks           TEXT,
    internal_notes    TEXT,
    review_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (report_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    body             TEXT NOT NULL,
    type             TEXT NOT NULL
                         CHECK (type IN ('report_approved', 'report_rejected', 'points_earned', 'system')),
    reference_id     UUID,
    is_read          BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.verification_reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    ai_result             JSONB,
    ai_verdict            TEXT,
    ai_confidence_score   FLOAT,
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_images (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id        UUID NOT NULL REFERENCES public.verification_reports(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path     TEXT NOT NULL,
    public_url       TEXT,
    file_name        TEXT,
    mime_type        TEXT,
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── 3. INDEXES ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_badge_id       ON public.profiles(badge_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user    ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON public.point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action  ON public.point_transactions(action);
CREATE INDEX IF NOT EXISTS idx_point_transactions_gift_redeemed
    ON public.point_transactions(user_id, created_at DESC)
    WHERE action = 'gift_redeemed';
CREATE INDEX IF NOT EXISTS idx_image_reports_user_id    ON public.image_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_status     ON public.image_reports(status);
CREATE INDEX IF NOT EXISTS idx_image_reports_submitted  ON public.image_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_reports_severity   ON public.image_reports(severity);
CREATE INDEX IF NOT EXISTS idx_image_reports_reward     ON public.image_reports(reward_amount);
CREATE INDEX IF NOT EXISTS idx_image_reports_image_hash
    ON public.image_reports (image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_image_reports_heatmap
    ON public.image_reports (status, reviewed_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_report_media_report      ON public.report_media(report_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_report   ON public.officer_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_officer  ON public.officer_reviews(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_decision ON public.officer_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_notifications_user       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON public.notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created    ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_reports_user   ON public.verification_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_reports_status ON public.verification_reports(status);
CREATE INDEX IF NOT EXISTS idx_verification_images_report  ON public.verification_images(report_id);
CREATE INDEX IF NOT EXISTS idx_verification_images_user    ON public.verification_images(user_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_location_address
    ON public.image_reports USING gin (location_address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_jurisdiction
    ON public.profiles(jurisdiction) WHERE jurisdiction IS NOT NULL;


-- ── 4. RLS ENABLE ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_images   ENABLE ROW LEVEL SECURITY;


-- ── 5. FUNCTIONS (pre-repair definitions) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'officer'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Legacy 3-arg overload from database/Traffic_eye_database.sql. Migration
-- 20260817000001 later adds a 5-arg overload WITHOUT dropping this one, so
-- both signatures coexist in production. Reproduced here on purpose.
CREATE OR REPLACE FUNCTION public.award_points(
    p_user_id      UUID,
    p_action       TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rule            RECORD;
    v_existing_count  INTEGER;
BEGIN
    SELECT * INTO v_rule FROM public.point_rules
    WHERE action_type = p_action AND is_active = true;
    IF v_rule IS NULL THEN RETURN false; END IF;

    IF v_rule.is_one_time THEN
        SELECT COUNT(*) INTO v_existing_count FROM public.point_transactions
        WHERE user_id = p_user_id AND action = p_action;
        IF v_existing_count > 0 THEN RETURN false; END IF;
    END IF;

    INSERT INTO public.point_transactions (user_id, amount, type, action, reference_id, description)
    VALUES (p_user_id, v_rule.points, 'earned', p_action, p_reference_id, v_rule.description);

    UPDATE public.profiles SET points_balance = points_balance + v_rule.points
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

-- Trusts client-controlled raw_user_meta_data->>'role' (role escalation).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role, badge_id, department, jurisdiction)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
        NEW.raw_user_meta_data->>'badge_id',
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'jurisdiction'
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_officer_review(
    p_report_id    UUID,
    p_officer_id   UUID,
    p_decision     TEXT,
    p_remarks      TEXT DEFAULT NULL,
    p_internal     TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_caller_id   UUID;
    v_caller_role TEXT;
    v_report      RECORD;
    v_review_id   UUID;
    v_reward      INTEGER := 0;
    v_notif_title TEXT;
    v_notif_body  TEXT;
BEGIN
    IF p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %.', p_decision USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN v_caller_id := p_officer_id; END IF;
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_report FROM public.image_reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id USING ERRCODE = 'no_data_found';
    END IF;

    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'already_reviewed', true,
            'current_status', v_report.status, 'message', 'Report has already been reviewed.');
    END IF;

    PERFORM set_config('traffic_eye.allow_profile_update', 'on', true);

    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, v_caller_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision = EXCLUDED.decision, remarks = EXCLUDED.remarks,
            internal_notes = EXCLUDED.internal_notes, review_timestamp = now(),
            officer_id = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    IF p_decision = 'approved' THEN
        CASE lower(COALESCE(v_report.severity, 'medium'))
            WHEN 'low' THEN v_reward := 50;
            WHEN 'medium' THEN v_reward := 70;
            WHEN 'high' THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE v_reward := 50;
        END CASE;
    ELSE
        v_reward := 0;
    END IF;

    UPDATE public.image_reports
    SET status = p_decision, reviewed_at = now(), reward_amount = v_reward
    WHERE id = p_report_id;

    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;
        INSERT INTO public.point_transactions (user_id, amount, type, action, reference_id, description)
        VALUES (v_report.user_id, v_reward, 'earned', 'report_approved', p_report_id,
                'Reward for approved violation report');
    END IF;

    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved!';
        v_notif_body  := COALESCE(p_remarks, 'Your report was approved. You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks, 'Your report was reviewed and rejected.');
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (v_report.user_id, v_notif_title, v_notif_body,
            CASE p_decision WHEN 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
            p_report_id);

    RETURN jsonb_build_object('success', true, 'already_reviewed', false,
        'review_id', v_review_id, 'decision', p_decision, 'reward_amount', v_reward);
END;
$$;

-- from database/crossuser_duplication.sql + database/phash.sql
-- NOTE: granted to anon in production (anonymous hash oracle).
CREATE OR REPLACE FUNCTION public.check_image_duplicate(p_hash TEXT)
RETURNS TABLE (is_duplicate BOOLEAN, existing_report_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_hash IS NULL OR trim(p_hash) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE, id FROM public.image_reports
    WHERE image_hash = p_hash AND status <> 'rejected'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_image_duplicate(TEXT) TO authenticated, anon;

-- from database/heatmap.sql — leaks report UUID, address, near-exact coords,
-- officer identity and the evidence image_url. Reproduced as-deployed.
DROP FUNCTION IF EXISTS public.get_approved_heatmap_points(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION public.get_approved_heatmap_points(
    p_min_lat   DOUBLE PRECISION DEFAULT NULL,
    p_max_lat   DOUBLE PRECISION DEFAULT NULL,
    p_min_lng   DOUBLE PRECISION DEFAULT NULL,
    p_max_lng   DOUBLE PRECISION DEFAULT NULL,
    p_days_back INTEGER          DEFAULT 365
)
RETURNS TABLE (
    id UUID, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
    location_address TEXT, violation_type TEXT, severity TEXT,
    reviewed_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ, weight INTEGER,
    officer_name TEXT, officer_badge TEXT, officer_jurisdiction TEXT, image_url TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_days_back || ' days')::INTERVAL;
    RETURN QUERY
    SELECT r.id,
        CASE WHEN r.latitude  IS NOT NULL THEN r.latitude  + (random() - 0.5) * 0.0003 ELSE NULL END,
        CASE WHEN r.longitude IS NOT NULL THEN r.longitude + (random() - 0.5) * 0.0003 ELSE NULL END,
        r.location_address, r.violation_type, r.severity, r.reviewed_at, r.submitted_at,
        CASE LOWER(COALESCE(r.severity, 'low'))
            WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1
        END::INTEGER,
        ov.officer_name, ov.officer_badge, ov.officer_jurisdiction, r.image_url
    FROM public.image_reports r
    LEFT JOIN LATERAL (
        SELECT p.full_name AS officer_name, p.badge_id AS officer_badge,
               p.jurisdiction AS officer_jurisdiction
        FROM public.officer_reviews o
        JOIN public.profiles p ON p.id = o.officer_id
        WHERE o.report_id = r.id LIMIT 1
    ) ov ON true
    WHERE r.status = 'approved'
      AND COALESCE(r.reviewed_at, r.submitted_at) >= v_cutoff
      AND ((p_min_lat IS NULL OR p_max_lat IS NULL OR p_min_lng IS NULL OR p_max_lng IS NULL)
        OR (r.latitude IS NOT NULL AND r.longitude IS NOT NULL
            AND r.latitude BETWEEN p_min_lat AND p_max_lat
            AND r.longitude BETWEEN p_min_lng AND p_max_lng))
    ORDER BY COALESCE(r.reviewed_at, r.submitted_at) DESC
    LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points TO authenticated;


-- ── 6. RLS POLICIES (pre-repair) ────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile"                     ON public.profiles;
DROP POLICY IF EXISTS "Officers can view all profiles"                 ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"     ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users during login"  ON public.profiles;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Officers can view all profiles"
    ON public.profiles FOR SELECT USING (public.is_officer());
CREATE POLICY "Enable insert for authenticated users only"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view active rules" ON public.point_rules;
CREATE POLICY "Anyone can view active rules"
    ON public.point_rules FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own transactions"                ON public.point_transactions;
DROP POLICY IF EXISTS "System can insert transactions"                 ON public.point_transactions;
DROP POLICY IF EXISTS "Citizens can insert own redemption transactions" ON public.point_transactions;

CREATE POLICY "Users can view own transactions"
    ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
-- Any authenticated user can insert a transaction for ANY user_id.
CREATE POLICY "System can insert transactions"
    ON public.point_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Citizens can insert own redemption transactions"
    ON public.point_transactions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Citizens view own reports"                ON public.image_reports;
DROP POLICY IF EXISTS "Citizens insert own reports"              ON public.image_reports;
DROP POLICY IF EXISTS "Officers view all pending reports"        ON public.image_reports;
DROP POLICY IF EXISTS "Officers update report status"            ON public.image_reports;
DROP POLICY IF EXISTS "Anyone can view approved image reports"   ON public.image_reports;

CREATE POLICY "Citizens view own reports"
    ON public.image_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Citizens insert own reports"
    ON public.image_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Officers view all pending reports"
    ON public.image_reports FOR SELECT USING (public.is_officer());
-- Unrestricted column-level UPDATE for any officer on any report.
CREATE POLICY "Officers update report status"
    ON public.image_reports FOR UPDATE USING (public.is_officer());
-- No role restriction: exposes full approved rows, including image_url.
CREATE POLICY "Anyone can view approved image reports"
    ON public.image_reports FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Citizens view own report media"    ON public.report_media;
DROP POLICY IF EXISTS "Citizens insert own report media"  ON public.report_media;
DROP POLICY IF EXISTS "Officers view all report media"    ON public.report_media;

CREATE POLICY "Citizens view own report media"
    ON public.report_media FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.image_reports
                   WHERE image_reports.id = report_media.report_id
                     AND image_reports.user_id = auth.uid()));
CREATE POLICY "Citizens insert own report media"
    ON public.report_media FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.image_reports
                        WHERE image_reports.id = report_media.report_id
                          AND image_reports.user_id = auth.uid()));
CREATE POLICY "Officers view all report media"
    ON public.report_media FOR SELECT USING (public.is_officer());

DROP POLICY IF EXISTS "Officers insert reviews"              ON public.officer_reviews;
DROP POLICY IF EXISTS "Officers view own reviews"            ON public.officer_reviews;
DROP POLICY IF EXISTS "Citizens view reviews on own reports" ON public.officer_reviews;

CREATE POLICY "Officers insert reviews"
    ON public.officer_reviews FOR INSERT
    WITH CHECK (public.is_officer() AND auth.uid() = officer_id);
CREATE POLICY "Officers view own reviews"
    ON public.officer_reviews FOR SELECT USING (public.is_officer());
CREATE POLICY "Citizens view reviews on own reports"
    ON public.officer_reviews FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.image_reports
                   WHERE image_reports.id = officer_reviews.report_id
                     AND image_reports.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Users mark own as read"       ON public.notifications;

CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
-- Any authenticated user can insert a notification for ANY user_id.
CREATE POLICY "System insert notifications"
    ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users mark own as read"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verification reports" ON public.verification_reports;
DROP POLICY IF EXISTS "Users can view own verification reports"   ON public.verification_reports;
DROP POLICY IF EXISTS "Users can update own verification reports" ON public.verification_reports;
DROP POLICY IF EXISTS "Users can delete own verification reports" ON public.verification_reports;

CREATE POLICY "Users can insert own verification reports"
    ON public.verification_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own verification reports"
    ON public.verification_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own verification reports"
    ON public.verification_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own verification reports"
    ON public.verification_reports FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own verification images" ON public.verification_images;
DROP POLICY IF EXISTS "Users can view own verification images"   ON public.verification_images;
DROP POLICY IF EXISTS "Users can delete own verification images" ON public.verification_images;

CREATE POLICY "Users can insert own verification images"
    ON public.verification_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own verification images"
    ON public.verification_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own verification images"
    ON public.verification_images FOR DELETE USING (auth.uid() = user_id);


-- ── 7. TRIGGERS ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS image_reports_updated_at ON public.image_reports;
CREATE TRIGGER image_reports_updated_at
    BEFORE UPDATE ON public.image_reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS verification_reports_updated_at ON public.verification_reports;
CREATE TRIGGER verification_reports_updated_at
    BEFORE UPDATE ON public.verification_reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


-- ── 8. REALTIME ─────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.image_reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_reviews;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.report_media;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 9. STORAGE BUCKETS (pre-repair: report-media is PUBLIC) ─────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-images', 'verification-images', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('report-media', 'report-media', true, 52428800,
        ARRAY['image/jpeg', 'image/png', 'image/webp',
              'video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification images"   ON storage.objects;
DROP POLICY IF EXISTS "Users can update own verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload report media"            ON storage.objects;
DROP POLICY IF EXISTS "Public can view report media"             ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report media"        ON storage.objects;

CREATE POLICY "Users can upload own verification images" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'verification-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own verification images" ON storage.objects FOR SELECT
    USING (bucket_id = 'verification-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own verification images" ON storage.objects FOR UPDATE
    USING (bucket_id = 'verification-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own verification images" ON storage.objects FOR DELETE
    USING (bucket_id = 'verification-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload report media" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'report-media' AND auth.uid()::text = (storage.foldername(name))[1]);
-- World-readable evidence.
CREATE POLICY "Public can view report media" ON storage.objects FOR SELECT
    USING (bucket_id = 'report-media');
CREATE POLICY "Users can delete own report media" ON storage.objects FOR DELETE
    USING (bucket_id = 'report-media' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── 10. SEED DATA ───────────────────────────────────────────────────────────
INSERT INTO public.point_rules (action_type, points, description, is_one_time) VALUES
    ('report_submitted', 10, 'Points for submitting a violation report', false),
    ('report_verified',  50, 'Bonus when officer verifies your report',  false),
    ('first_report',     30, 'One-time bonus for your first report',     true)
ON CONFLICT (action_type) DO NOTHING;


-- ── 11. GRANTS ──────────────────────────────────────────────────────────────
-- The hosted project historically relied on Supabase auto-exposing new tables
-- to anon/authenticated. config.toml pins auto_expose_new_tables = false, so
-- reproduce the effective grants explicitly for the pre-repair baseline.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL                            ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL                            ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- END OF BASELINE
-- ═══════════════════════════════════════════════════════════════════════════
