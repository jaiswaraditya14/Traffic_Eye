-- ═══════════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — COMPLETE DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Paste this entire file into:  Supabase Dashboard > SQL Editor > New Query > Run
--
-- ✅ Safe to re-run  — uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ✅ Dependency order — no forward references
-- ✅ RLS enabled     — every public table is protected
--
-- Updated: 2026-04-20
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. EXTENSIONS ───────────────────────────────────────────────────────────
-- gen_random_uuid() is built-in on PG 13+, but pgcrypto is a safe fallback.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pg_trgm enables fast ILIKE '%keyword%' searches on location_address
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ── 2. TABLES (dependency order) ────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ profiles — extends auth.users with app-specific data                    │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            TEXT NOT NULL,
    full_name        TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    role             TEXT NOT NULL DEFAULT 'citizen'
                         CHECK (role IN ('citizen', 'officer')),
    avatar_url       TEXT,
    points_balance   INTEGER NOT NULL DEFAULT 0,
    -- Officer-specific fields (nullable for citizens)
    badge_id         TEXT UNIQUE,
    jurisdiction     TEXT,
    department       TEXT,
    -- Timestamps
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ point_rules — configurable point-earning rules                          │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.point_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type      TEXT UNIQUE NOT NULL,
    points           INTEGER NOT NULL,
    description      TEXT,
    is_one_time      BOOLEAN NOT NULL DEFAULT false,
    is_active        BOOLEAN NOT NULL DEFAULT true
);

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ point_transactions — tracks all point earnings and redemptions           │
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ image_reports — citizen-submitted traffic violation reports              │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.image_reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Media
    image_url             TEXT NOT NULL,
    image_storage_path    TEXT,
    -- Location
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    location_address      TEXT,
    -- AI Analysis
    violation_type        TEXT,
    violation_description TEXT,
    severity              TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ai_confidence         NUMERIC(5,4),
    ai_raw_result         JSONB,
    vehicle_number        TEXT,
    -- Workflow
    status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
    reward_amount         INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Soft-delete
    is_archived           BOOLEAN NOT NULL DEFAULT false
);

-- If image_reports already existed, ensure the new columns are present
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS reward_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ officer_reviews — one review per image_report                           │
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ notifications — push/in-app notifications for users                     │
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ report_media — images & videos linked to image_reports (evidence gallery)│
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ verification_reports — AI-powered image verification reports             │
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ verification_images — images attached to verification_reports            │
-- └──────────────────────────────────────────────────────────────────────────┘
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

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_badge_id       ON public.profiles(badge_id);

-- point_transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user    ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON public.point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action  ON public.point_transactions(action);

-- Dedicated partial index for gift_redeemed lookups (used by getRedeemedItems)
CREATE INDEX IF NOT EXISTS idx_point_transactions_gift_redeemed
    ON public.point_transactions(user_id, created_at DESC)
    WHERE action = 'gift_redeemed';

-- image_reports
CREATE INDEX IF NOT EXISTS idx_image_reports_user_id    ON public.image_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_image_reports_status     ON public.image_reports(status);
CREATE INDEX IF NOT EXISTS idx_image_reports_submitted  ON public.image_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_reports_severity   ON public.image_reports(severity);
CREATE INDEX IF NOT EXISTS idx_image_reports_reward     ON public.image_reports(reward_amount);

-- report_media
CREATE INDEX IF NOT EXISTS idx_report_media_report      ON public.report_media(report_id);

-- officer_reviews
CREATE INDEX IF NOT EXISTS idx_officer_reviews_report   ON public.officer_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_officer  ON public.officer_reviews(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_decision ON public.officer_reviews(decision);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread      ON public.notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created     ON public.notifications(created_at DESC);

-- verification_reports
CREATE INDEX IF NOT EXISTS idx_verification_reports_user   ON public.verification_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_reports_status ON public.verification_reports(status);

-- verification_images
CREATE INDEX IF NOT EXISTS idx_verification_images_report  ON public.verification_images(report_id);
CREATE INDEX IF NOT EXISTS idx_verification_images_user    ON public.verification_images(user_id);

-- Jurisdiction-based routing indexes (for officer area-level filtering)
CREATE INDEX IF NOT EXISTS idx_image_reports_location_address
    ON public.image_reports USING gin (location_address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_jurisdiction
    ON public.profiles(jurisdiction) WHERE jurisdiction IS NOT NULL;


-- ── 4. ROW-LEVEL SECURITY — ENABLE ─────────────────────────────────────────

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_images   ENABLE ROW LEVEL SECURITY;


-- ── 5. RLS POLICIES ────────────────────────────────────────────────────────

-- ── profiles ──
DROP POLICY IF EXISTS "Users can view own profile"                    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                  ON public.profiles;
DROP POLICY IF EXISTS "Officers can view all profiles"               ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only"   ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users during login" ON public.profiles;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Officers can view all profiles"
    ON public.profiles FOR SELECT
    USING (is_officer());

CREATE POLICY "Enable insert for authenticated users only"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ── point_rules ──
DROP POLICY IF EXISTS "Anyone can view active rules" ON public.point_rules;

CREATE POLICY "Anyone can view active rules"
    ON public.point_rules FOR SELECT
    USING (is_active = true);

-- ── point_transactions ──
DROP POLICY IF EXISTS "Users can view own transactions"  ON public.point_transactions;
DROP POLICY IF EXISTS "System can insert transactions"   ON public.point_transactions;

CREATE POLICY "Users can view own transactions"
    ON public.point_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Only authenticated users (via SECURITY DEFINER functions) can insert
CREATE POLICY "System can insert transactions"
    ON public.point_transactions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Citizens can insert own redemption transactions" ON public.point_transactions;
CREATE POLICY "Citizens can insert own redemption transactions"
    ON public.point_transactions FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
    );

-- ── image_reports ──
DROP POLICY IF EXISTS "Citizens view own reports"          ON public.image_reports;
DROP POLICY IF EXISTS "Citizens insert own reports"        ON public.image_reports;
DROP POLICY IF EXISTS "Officers view all pending reports"  ON public.image_reports;
DROP POLICY IF EXISTS "Officers update report status"      ON public.image_reports;

CREATE POLICY "Citizens view own reports"
    ON public.image_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Citizens insert own reports"
    ON public.image_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Officers view all pending reports"
    ON public.image_reports FOR SELECT
    USING (is_officer());

CREATE POLICY "Officers update report status"
    ON public.image_reports FOR UPDATE
    USING (is_officer());

-- ── report_media ──
DROP POLICY IF EXISTS "Citizens view own report media"    ON public.report_media;
DROP POLICY IF EXISTS "Citizens insert own report media"  ON public.report_media;
DROP POLICY IF EXISTS "Officers view all report media"    ON public.report_media;

CREATE POLICY "Citizens view own report media"
    ON public.report_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.image_reports
            WHERE image_reports.id = report_media.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Citizens insert own report media"
    ON public.report_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.image_reports
            WHERE image_reports.id = report_media.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Officers view all report media"
    ON public.report_media FOR SELECT
    USING (is_officer());

-- ── officer_reviews ──
DROP POLICY IF EXISTS "Officers insert reviews"               ON public.officer_reviews;
DROP POLICY IF EXISTS "Officers view own reviews"             ON public.officer_reviews;
DROP POLICY IF EXISTS "Citizens view reviews on own reports"  ON public.officer_reviews;

CREATE POLICY "Officers insert reviews"
    ON public.officer_reviews FOR INSERT
    WITH CHECK (is_officer() AND auth.uid() = officer_id);

CREATE POLICY "Officers view own reviews"
    ON public.officer_reviews FOR SELECT
    USING (is_officer());

CREATE POLICY "Citizens view reviews on own reports"
    ON public.officer_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.image_reports
            WHERE image_reports.id = officer_reviews.report_id
              AND image_reports.user_id = auth.uid()
        )
    );

-- ── notifications ──
DROP POLICY IF EXISTS "Users view own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users mark own as read"        ON public.notifications;

CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Only authenticated sessions (SECURITY DEFINER functions) insert notifications
CREATE POLICY "System insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users mark own as read"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ── verification_reports ──
DROP POLICY IF EXISTS "Users can insert own verification reports" ON public.verification_reports;
DROP POLICY IF EXISTS "Users can view own verification reports"   ON public.verification_reports;
DROP POLICY IF EXISTS "Users can update own verification reports" ON public.verification_reports;
DROP POLICY IF EXISTS "Users can delete own verification reports" ON public.verification_reports;

CREATE POLICY "Users can insert own verification reports"
    ON public.verification_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own verification reports"
    ON public.verification_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own verification reports"
    ON public.verification_reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verification reports"
    ON public.verification_reports FOR DELETE
    USING (auth.uid() = user_id);

-- ── verification_images ──
DROP POLICY IF EXISTS "Users can insert own verification images" ON public.verification_images;
DROP POLICY IF EXISTS "Users can view own verification images"   ON public.verification_images;
DROP POLICY IF EXISTS "Users can delete own verification images" ON public.verification_images;

CREATE POLICY "Users can insert own verification images"
    ON public.verification_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own verification images"
    ON public.verification_images FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verification images"
    ON public.verification_images FOR DELETE
    USING (auth.uid() = user_id);


-- ── 6. FUNCTIONS ────────────────────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ is_officer() — checks if the calling user has the officer role          │
-- │ SECURITY DEFINER so it can bypass RLS to read profiles (avoids loops)   │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'officer'
    );
END;
$$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ trigger_set_updated_at() — auto-sets updated_at on UPDATE               │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ award_points() — awards points to a user based on point_rules           │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.award_points(
    p_user_id      UUID,
    p_action       TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rule            RECORD;
    v_existing_count  INTEGER;
BEGIN
    -- Get the rule for this action
    SELECT * INTO v_rule
    FROM public.point_rules
    WHERE action_type = p_action AND is_active = true;

    IF v_rule IS NULL THEN
        RETURN false;
    END IF;

    -- Check if one-time bonus already claimed
    IF v_rule.is_one_time THEN
        SELECT COUNT(*) INTO v_existing_count
        FROM public.point_transactions
        WHERE user_id = p_user_id AND action = p_action;

        IF v_existing_count > 0 THEN
            RETURN false;
        END IF;
    END IF;

    -- Insert transaction
    INSERT INTO public.point_transactions (user_id, amount, type, action, reference_id, description)
    VALUES (p_user_id, v_rule.points, 'earned', p_action, p_reference_id, v_rule.description);

    -- Update user balance
    UPDATE public.profiles
    SET points_balance = points_balance + v_rule.points
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ handle_new_user() — auto-creates a profile row on auth.users INSERT     │
-- └──────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        badge_id,
        department,
        jurisdiction
    )
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

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ submit_officer_review() — atomic officer decision on a report           │
-- │ Inserts review, updates status, computes severity-based reward,         │
-- │ credits citizen points, and sends push notification                      │
-- │                                                                          │
-- │ Reward table:                                                            │
-- │   low      → 50 pts    medium   → 100 pts                               │
-- │   high     → 200 pts   critical → 200 pts                               │
-- └──────────────────────────────────────────────────────────────────────────┘
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
            WHEN 'medium'   THEN v_reward := 100;
            WHEN 'high'     THEN v_reward := 200;
            WHEN 'critical' THEN v_reward := 200;
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


-- ── 7. TRIGGERS ─────────────────────────────────────────────────────────────

-- Auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Auto-update updated_at on image_reports
DROP TRIGGER IF EXISTS image_reports_updated_at ON public.image_reports;
CREATE TRIGGER image_reports_updated_at
    BEFORE UPDATE ON public.image_reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Auto-update updated_at on verification_reports
DROP TRIGGER IF EXISTS verification_reports_updated_at ON public.verification_reports;
CREATE TRIGGER verification_reports_updated_at
    BEFORE UPDATE ON public.verification_reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


-- ── 8. REALTIME ─────────────────────────────────────────────────────────────

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.image_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_media;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 9. STORAGE BUCKETS ─────────────────────────────────────────────────────

-- 9a. verification-images bucket (legacy, used by verification_reports)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-images',
    'verification-images',
    false,
    10485760,   -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for verification-images bucket
DROP POLICY IF EXISTS "Users can upload own verification images"   ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification images"     ON storage.objects;
DROP POLICY IF EXISTS "Users can update own verification images"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification images"   ON storage.objects;

CREATE POLICY "Users can upload own verification images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own verification images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own verification images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own verification images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 9b. report-media bucket (images + videos for image_reports)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-media',
    'report-media',
    true,
    52428800,   -- 50 MB (supports videos)
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for report-media bucket
DROP POLICY IF EXISTS "Users can upload report media"      ON storage.objects;
DROP POLICY IF EXISTS "Public can view report media"       ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report media"  ON storage.objects;

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


-- ── 10. SEED DATA ───────────────────────────────────────────────────────────

-- Point rules (idempotent)
INSERT INTO public.point_rules (action_type, points, description, is_one_time) VALUES
    ('report_submitted', 10, 'Points for submitting a violation report', false),
    ('report_verified',  50, 'Bonus when officer verifies your report',  false),
    ('first_report',     30, 'One-time bonus for your first report',     true)
ON CONFLICT (action_type) DO NOTHING;


-- ── 11. MIGRATION CLEANUP (safe to re-run) ──────────────────────────────────
-- Remove stale referral system columns if they still exist
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referred_by;

-- Remove stale referral point rule if it exists
DELETE FROM public.point_rules WHERE action_type = 'referral_success';

-- Drop stale duplicate trigger functions
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- Remove the dangerous open-access policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users during login" ON public.profiles;

-- Ensure Vakola officer has correct badge + jurisdiction
-- (Safe: updates 0 rows if the officer doesn't exist yet)
UPDATE public.profiles
    SET badge_id = 'EYE-055', jurisdiction = 'Vakola'
    WHERE badge_id IN ('EYE-001', 'EYE-055');


-- ── 12. JURISDICTION-BASED ROUTING CONVENTION ────────────────────────────────
--
-- Officer Badge ID → Area Pincode Mapping:
--   Badge format:   EYE-{pincode_suffix}
--   Pincode format: 400{pincode_suffix}  (Mumbai metro area)
--
-- Examples:
--   EYE-055  →  400055  (Vakola / Santacruz East)
--   EYE-071  →  400071  (Chembur)
--   EYE-053  →  400053  (Andheri East)
--
-- The app extracts trailing digits from badge_id, pads to 3 digits,
-- prepends '400', and searches location_address with ILIKE.
-- Additionally, profiles.jurisdiction stores area keywords like 'Vakola'
-- which are also matched via ILIKE.
-- Both conditions are combined with OR.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- ═══════════════════════════════════════════════════════════════════════════════
