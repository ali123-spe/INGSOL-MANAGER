-- ============================================================
-- INGSOL MANAGER -- DEFINITIVE DATE_RANGES FIX
-- ============================================================
-- Run this in: Supabase Dashboard --> SQL Editor --> New Query
-- This script is SAFE to run multiple times (fully idempotent).
-- It does NOT drop or delete any existing data.
-- ============================================================

-- STEP 1: Create date_ranges (using auth.users FK directly -- no profiles dependency)

CREATE TABLE IF NOT EXISTS public.date_ranges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Planned',
  color            TEXT DEFAULT '#024791',
  source_reference_url TEXT,
  internal_notes   TEXT,
  tags             TEXT[],
  actual_start_at  TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT date_ranges_end_after_start CHECK (end_date >= start_date)
);

-- STEP 2: Add any missing columns (safe if they already exist)

ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS status               TEXT NOT NULL DEFAULT 'Planned';
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS color                TEXT DEFAULT '#024791';
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS source_reference_url TEXT;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS internal_notes       TEXT;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS tags                 TEXT[];
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS actual_start_at      TIMESTAMPTZ;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS completed_at         TIMESTAMPTZ;

-- STEP 3: Indexes

CREATE INDEX IF NOT EXISTS idx_date_ranges_user_id ON public.date_ranges(user_id);
CREATE INDEX IF NOT EXISTS idx_date_ranges_start   ON public.date_ranges(start_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_end     ON public.date_ranges(end_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_status  ON public.date_ranges(status);

-- STEP 4: Enable RLS

ALTER TABLE public.date_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own date ranges"   ON public.date_ranges;
DROP POLICY IF EXISTS "Users can insert own date ranges" ON public.date_ranges;
DROP POLICY IF EXISTS "Users can update own date ranges" ON public.date_ranges;
DROP POLICY IF EXISTS "Users can delete own date ranges" ON public.date_ranges;

CREATE POLICY "Users can view own date ranges"
  ON public.date_ranges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own date ranges"
  ON public.date_ranges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own date ranges"
  ON public.date_ranges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own date ranges"
  ON public.date_ranges FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 5: updated_at auto-trigger

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS date_ranges_updated_at ON public.date_ranges;
CREATE TRIGGER date_ranges_updated_at
  BEFORE UPDATE ON public.date_ranges
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- STEP 6: range_attachments

CREATE TABLE IF NOT EXISTS public.range_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id        UUID NOT NULL REFERENCES public.date_ranges(id) ON DELETE CASCADE,
  file_id         UUID REFERENCES public.files(id) ON DELETE SET NULL,
  link_name       TEXT,
  link_url        TEXT,
  attachment_type TEXT NOT NULL DEFAULT 'file' CHECK (attachment_type IN ('file', 'link')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_range_attachments_range_id ON public.range_attachments(range_id);
CREATE INDEX IF NOT EXISTS idx_range_attachments_file_id  ON public.range_attachments(file_id);

ALTER TABLE public.range_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own range attachments"   ON public.range_attachments;
DROP POLICY IF EXISTS "Users can insert own range attachments" ON public.range_attachments;
DROP POLICY IF EXISTS "Users can delete own range attachments" ON public.range_attachments;

CREATE POLICY "Users can view own range attachments"
  ON public.range_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
      AND date_ranges.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own range attachments"
  ON public.range_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
      AND date_ranges.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own range attachments"
  ON public.range_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
      AND date_ranges.user_id = auth.uid()
  ));

-- STEP 7: range_posts

CREATE TABLE IF NOT EXISTS public.range_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id    UUID NOT NULL REFERENCES public.date_ranges(id) ON DELETE CASCADE,
  post_ref_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(range_id, post_ref_id)
);

CREATE INDEX IF NOT EXISTS idx_range_posts_range_id    ON public.range_posts(range_id);
CREATE INDEX IF NOT EXISTS idx_range_posts_post_ref_id ON public.range_posts(post_ref_id);

ALTER TABLE public.range_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own range posts"   ON public.range_posts;
DROP POLICY IF EXISTS "Users can insert own range posts" ON public.range_posts;
DROP POLICY IF EXISTS "Users can delete own range posts" ON public.range_posts;

CREATE POLICY "Users can view own range posts"
  ON public.range_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
      AND date_ranges.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own range posts"
  ON public.range_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
      AND date_ranges.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own range posts"
  ON public.range_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
      AND date_ranges.user_id = auth.uid()
  ));

-- STEP 8: files -- add mime_type if missing

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- STEP 9: Verify -- you should see 0 rows (or existing campaigns), NOT an error

SELECT id, user_id, name, start_date, end_date, status, color
FROM public.date_ranges
LIMIT 5;

-- ============================================================
-- DONE.
-- If you still see a schema cache error after running this:
--   1. Supabase Dashboard --> Settings --> API
--   2. Click "Reload schema cache"
-- ============================================================
