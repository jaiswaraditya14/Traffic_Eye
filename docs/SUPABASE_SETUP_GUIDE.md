# 🚀 Supabase Setup Guide for Traffic Eye (College Project Demo)

This guide provides **step-by-step instructions** to set up a clean, working Supabase backend for the **Traffic Eye** mobile app. 

> [!NOTE]
> **College Project Mode:** Security, strict Row-Level Security (RLS), and complex guard triggers are kept **simple and permissive**. This ensures you, your group partners, and professors never get blocked by `403 Forbidden`, `RLS policy violation`, or unconfirmed email errors during tests and live presentations.

---

## Quick Setup Overview
1. **Create Supabase Project & Copy Keys** (`.env`)
2. **Configure Auth Settings** (Disable email confirmation)
3. **Run All-In-One SQL Script** (Tables, Functions, Triggers, Seed Data)
4. **Create Storage Bucket** (`report-media`)
5. **Create Test Officer & Citizen Accounts**
6. **(Optional) Configure AI Edge Function or API Keys**

---

## Step 1: Create Supabase Project & Setup `.env`

1. Go to [database.new](https://database.new) and sign in.
2. Click **New Project**:
   - **Name:** `TrafficEye-Demo`
   - **Database Password:** Pick something simple (e.g. `trafficeye12345`)
   - **Region:** Pick the nearest region (e.g., `South Asia (Mumbai)`).
3. Once the project finishes provisioning (~2 mins):
   - Go to **Project Settings** (gear icon) > **API**.
   - Copy **Project URL** and **Project API Key (`anon` / `public`)**.
4. Open the `Traffic_Eye` project root on your computer and edit/create `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
   ```

---

## Step 2: Configure Authentication (Disable Email Confirmation)

For a college demo, you want immediate sign-ups without waiting for email verification links:

1. In Supabase Dashboard, click **Authentication** > **Providers** > **Email**.
2. **Toggle OFF "Confirm email"**.
3. Under **Authentication** > **URL Configuration**:
   - **Site URL:** `trafficeye://auth`
   - **Redirect URLs:** Add `trafficeye://*` and `trafficeye://reset-password`
4. Click **Save**.

---

## Step 3: Run the All-In-One Database SQL Script

Go to Supabase Dashboard > **SQL Editor** > **New Query**, paste the entire SQL block below, and click **Run**.

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE: ALL-IN-ONE SCHEMA & FUNCTIONS (COLLEGE DEMO VERSION)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. TABLES

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            TEXT NOT NULL,
    full_name        TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    role             TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'officer', 'admin')),
    avatar_url       TEXT,
    points_balance   INTEGER NOT NULL DEFAULT 0,
    badge_id         TEXT UNIQUE,
    jurisdiction     TEXT,
    department       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Point Rules
CREATE TABLE IF NOT EXISTS public.point_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type      TEXT UNIQUE NOT NULL,
    points           INTEGER NOT NULL,
    description      TEXT,
    is_one_time      BOOLEAN NOT NULL DEFAULT false,
    is_active        BOOLEAN NOT NULL DEFAULT true
);

-- Point Transactions
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

-- Image Reports
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
    status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reward_amount         INTEGER NOT NULL DEFAULT 0,
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_archived           BOOLEAN NOT NULL DEFAULT false,
    image_hash            TEXT DEFAULT NULL,
    authenticity_check    JSONB DEFAULT NULL
);

-- Report Media (multi-photo or video evidence)
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

-- Officer Reviews
CREATE TABLE IF NOT EXISTS public.officer_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id         UUID NOT NULL REFERENCES public.image_reports(id) ON DELETE CASCADE UNIQUE,
    officer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision          TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    remarks           TEXT,
    internal_notes    TEXT,
    review_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    body             TEXT NOT NULL,
    type             TEXT NOT NULL,
    reference_id     UUID,
    is_read          BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PERMISSIVE ROW LEVEL SECURITY (RLS) FOR COLLEGE PROJECT
-- This keeps RLS active to satisfy Supabase warnings, but grants open access so
-- your demo will NEVER fail due to policy permission errors.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_profiles" ON public.profiles;
CREATE POLICY "open_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_point_rules" ON public.point_rules;
CREATE POLICY "open_point_rules" ON public.point_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_point_transactions" ON public.point_transactions;
CREATE POLICY "open_point_transactions" ON public.point_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_image_reports" ON public.image_reports;
CREATE POLICY "open_image_reports" ON public.image_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_report_media" ON public.report_media;
CREATE POLICY "open_report_media" ON public.report_media FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_officer_reviews" ON public.officer_reviews;
CREATE POLICY "open_officer_reviews" ON public.officer_reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_notifications" ON public.notifications;
CREATE POLICY "open_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. AUTH TRIGGER: Automatically creates profile upon user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (
        id, email, full_name, phone, role, badge_id, department, jurisdiction
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
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RPC FUNCTIONS REQUIRED BY APP

-- 5A. Officer Email Lookup by Badge (for Officer Badge Login)
CREATE OR REPLACE FUNCTION public.get_officer_email_by_badge(p_badge_id TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT email FROM public.profiles
    WHERE badge_id = p_badge_id AND role IN ('officer', 'admin')
    LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_officer_email_by_badge(TEXT) TO anon, authenticated;

-- 5B. Check Duplicate Plate / Image
CREATE OR REPLACE FUNCTION public.check_plate_duplicate(p_vehicle_number TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.image_reports
        WHERE vehicle_number = p_vehicle_number
          AND created_at >= (now() - INTERVAL '24 hours')
          AND status IN ('pending', 'approved')
    );
$$;
GRANT EXECUTE ON FUNCTION public.check_plate_duplicate(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_image_duplicate(p_hash TEXT)
RETURNS TABLE (report_id UUID, duplicate_status TEXT) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT id, status FROM public.image_reports
    WHERE image_hash = p_hash LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.check_image_duplicate(TEXT) TO anon, authenticated;

-- 5C. Officer Review Submission (Approve / Reject & Reward Points)
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
    v_report       RECORD;
    v_reward       INTEGER := 0;
    v_notif_title  TEXT;
    v_notif_body   TEXT;
BEGIN
    SELECT * INTO v_report FROM public.image_reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;

    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already reviewed');
    END IF;

    -- Calculate Reward Points based on severity
    IF p_decision = 'approved' THEN
        v_reward := CASE lower(COALESCE(v_report.severity, 'medium'))
            WHEN 'low'      THEN 20
            WHEN 'medium'   THEN 50
            WHEN 'high'     THEN 75
            WHEN 'critical' THEN 100
            ELSE 50
        END;
    ELSE
        v_reward := 0;
    END IF;

    -- Update Report Status
    UPDATE public.image_reports
    SET status = p_decision,
        reward_amount = v_reward,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_report_id;

    -- Insert Officer Review
    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, p_officer_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO NOTHING;

    -- If approved, credit citizen points & add transaction
    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        INSERT INTO public.point_transactions (user_id, amount, type, action, reference_id, description)
        VALUES (
            v_report.user_id,
            v_reward,
            'earned',
            'report_verified',
            p_report_id,
            'Report approved: ' || COALESCE(v_report.violation_type, 'Traffic Violation')
        );

        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := 'Your traffic report was approved by the officer. You earned ' || v_reward || ' reward points!';
    ELSE
        v_notif_title := 'Report Update';
        v_notif_body  := 'Your traffic report was reviewed and marked as rejected. Remarks: ' || COALESCE(p_remarks, 'None');
    END IF;

    -- Send in-app notification to citizen
    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (v_report.user_id, v_notif_title, v_notif_body, 'report_' || p_decision, p_report_id);

    RETURN jsonb_build_object(
        'success', true,
        'decision', p_decision,
        'reward_awarded', v_reward
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_officer_review(UUID, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5D. Reward Redemption Function
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
    v_balance INTEGER;
BEGIN
    SELECT points_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_balance < p_points THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient points balance.');
    END IF;

    UPDATE public.profiles
    SET points_balance = points_balance - p_points
    WHERE id = p_user_id;

    INSERT INTO public.point_transactions (user_id, amount, type, action, description)
    VALUES (
        p_user_id,
        p_points,
        'redeemed',
        'gift_redeemed',
        'Redeemed ' || p_item_title || ' (Coupon: ' || p_coupon || ')'
    );

    RETURN jsonb_build_object('success', true, 'remaining_balance', v_balance - p_points);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_reward_item(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;

-- 5E. Violation Heatmap RPC
CREATE OR REPLACE FUNCTION public.get_approved_heatmap_points()
RETURNS TABLE (
    id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    violation_type TEXT,
    severity TEXT,
    reviewed_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT id, latitude, longitude, violation_type, severity, reviewed_at
    FROM public.image_reports
    WHERE status = 'approved' AND latitude IS NOT NULL AND longitude IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points() TO anon, authenticated;

-- 6. DEFAULT POINT RULES SEED DATA
INSERT INTO public.point_rules (action_type, points, description, is_one_time) VALUES
    ('report_submitted', 10, 'Points for submitting a violation report', false),
    ('report_verified',  50, 'Bonus when officer verifies your report',  false),
    ('first_report',     30, 'One-time bonus for your first report',     true)
ON CONFLICT (action_type) DO NOTHING;
```

---

## Step 4: Create the Storage Bucket (`report-media`)

This is where captured violation photos and videos are stored:

1. In Supabase Dashboard, click **Storage** (left sidebar).
2. Click **New Bucket**:
   - **Name:** `report-media` *(exact name required)*
   - **Public bucket:** **Toggle ON** *(so image URLs load easily in the app)*
   - **File size limit:** `50MB`
   - **Allowed MIME types:** Leave empty or type `image/*,video/*`
3. Click **Save**.
4. In the SQL Editor, run this quick snippet to ensure anyone can upload photos without RLS blocks:
   ```sql
   DROP POLICY IF EXISTS "Public Report Media Access" ON storage.objects;
   CREATE POLICY "Public Report Media Access"
   ON storage.objects FOR ALL
   USING (bucket_id = 'report-media')
   WITH CHECK (bucket_id = 'report-media');
   ```

---

## Step 5: Provision Demo Officer & Citizen Accounts

For your presentation, you need an **Officer Account** with a Badge ID.

### Option A: Create Officer via SQL (Fastest)

Run this directly in **SQL Editor**:

```sql
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- 1. Create officer in auth.users
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    )
    VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'officer@trafficeye.local',
        crypt('Officer@123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Inspector Sharma","role":"officer","badge_id":"MH-101","department":"Traffic Division","jurisdiction":"Zone 1"}',
        now(),
        now(),
        'authenticated',
        'authenticated'
    );

    -- 2. Ensure profile has officer role and badge
    INSERT INTO public.profiles (id, email, full_name, role, badge_id, department, jurisdiction)
    VALUES (
        new_user_id,
        'officer@trafficeye.local',
        'Inspector Sharma',
        'officer',
        'MH-101',
        'Traffic Division',
        'Zone 1'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'officer',
        badge_id = 'MH-101',
        department = 'Traffic Division',
        jurisdiction = 'Zone 1';
END $$;
```

**Your Officer Credentials for Demo:**
- **Badge ID:** `MH-101`
- **Password:** `Officer@123`
*(Or sign in via Email: `officer@trafficeye.local` / `Officer@123`)*

---

## Step 6: AI Setup vs. Manual Fallback

In `Traffic Eye`, the app checks violations using an AI edge function (`ai-analyze`).

- **If you have a Gemini or Groq API key:**
  1. Install Supabase CLI or use Supabase Dashboard > Edge Functions > Secrets:
     - `GEMINI_API_KEY_1` = `your_gemini_api_key`
     - or `GROQ_API_KEY_1` = `your_groq_api_key`
  2. Deploy `supabase/functions/ai-analyze`.
- **If you don't want to deploy Edge Functions right now:**
  - The app already has a **built-in manual fallback**! When AI is unreachable, the citizen simply enters the violation type and vehicle number manually, and the report goes directly to the officer queue.

---

## Step 7: Testing Your College Presentation Flow

1. **Sign up a Citizen:** Open app > Sign Up (`citizen@test.com` / `Pass1234`).
2. **Submit a Violation:**
   - Tap "Report Violation".
   - Pick a photo.
   - GPS is automatically extracted (or pick location on map).
   - Enter vehicle plate number (e.g., `MH 02 CD 4567`) and violation type.
   - Tap **Submit Report**.
3. **Switch to Officer App:**
   - Log out of citizen.
   - Tap "Officer Login".
   - Enter Badge ID: `MH-101` & Password: `Officer@123`.
   - Open **Pending Queue** → see the citizen's report.
   - Tap **Approve**.
4. **Verify Citizen Rewards:**
   - Switch back to the citizen account.
   - Check notification bell: "Report Approved! You earned 50 reward points!".
   - Check **Rewards** screen: Points balance increased!
