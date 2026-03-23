-- ═══════════════════════════════════════════════════════════════════════════
-- Traffic Eye — Supabase Migration
-- Run this in: Supabase Dashboard > SQL Editor → New Query → Run All
-- ─────────────────────────────────────────────────────────────────────────
-- SAFE TO RUN: Uses IF NOT EXISTS / ON CONFLICT DO NOTHING guards.
-- Does NOT modify any existing tables, columns, or RLS policies.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- PART 1: verification_reports
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verification_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_result            jsonb,
  ai_verdict           text,
  ai_confidence_score  float,
  submitted_at         timestamptz DEFAULT now(),
  processed_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_reports'
      AND policyname = 'Users can insert own verification reports'
  ) THEN
    CREATE POLICY "Users can insert own verification reports"
      ON public.verification_reports FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_reports'
      AND policyname = 'Users can view own verification reports'
  ) THEN
    CREATE POLICY "Users can view own verification reports"
      ON public.verification_reports FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_reports'
      AND policyname = 'Users can update own verification reports'
  ) THEN
    CREATE POLICY "Users can update own verification reports"
      ON public.verification_reports FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- PART 2: verification_images
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verification_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES public.verification_reports(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  public_url    text,
  file_name     text,
  mime_type     text,
  uploaded_at   timestamptz DEFAULT now()
);

ALTER TABLE public.verification_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_images'
      AND policyname = 'Users can insert own verification images'
  ) THEN
    CREATE POLICY "Users can insert own verification images"
      ON public.verification_images FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_images'
      AND policyname = 'Users can view own verification images'
  ) THEN
    CREATE POLICY "Users can view own verification images"
      ON public.verification_images FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'verification_images'
      AND policyname = 'Users can delete own verification images'
  ) THEN
    CREATE POLICY "Users can delete own verification images"
      ON public.verification_images FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- PART 3: updated_at auto-trigger on verification_reports
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
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

DROP TRIGGER IF EXISTS verification_reports_updated_at ON public.verification_reports;
CREATE TRIGGER verification_reports_updated_at
  BEFORE UPDATE ON public.verification_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- PART 4: Enable Realtime for verification_reports
-- ───────────────────────────────────────────────────────────────────────────
-- NOTE: If this errors with "relation already exists in publication", ignore it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_reports;


-- ───────────────────────────────────────────────────────────────────────────
-- PART 5: Storage Bucket — verification-images (private, 10 MB limit)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-images',
  'verification-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Users can upload own verification images'
  ) THEN
    CREATE POLICY "Users can upload own verification images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Users can view own verification images'
  ) THEN
    CREATE POLICY "Users can view own verification images"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Users can delete own verification images'
  ) THEN
    CREATE POLICY "Users can delete own verification images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'verification-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
