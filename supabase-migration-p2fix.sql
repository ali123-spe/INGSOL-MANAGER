-- ============================================================
-- INGSOL MANAGER V1.5 — PROMPT 2 FIX MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Create date_ranges if it doesn't exist
CREATE TABLE IF NOT EXISTS public.date_ranges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#024791',
  status TEXT NOT NULL DEFAULT 'Planned',
  actual_start_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

-- 2. Add columns if they were missing from an older version
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Planned';
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_date_ranges_user_id   ON public.date_ranges(user_id);
CREATE INDEX IF NOT EXISTS idx_date_ranges_start     ON public.date_ranges(start_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_end       ON public.date_ranges(end_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_status    ON public.date_ranges(status);

-- 4. RLS
ALTER TABLE public.date_ranges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe - won't error if missing because of IF EXISTS)
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

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS date_ranges_updated_at ON public.date_ranges;
CREATE TRIGGER date_ranges_updated_at
  BEFORE UPDATE ON public.date_ranges
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 6. range_attachments (files and links attached to a campaign)
CREATE TABLE IF NOT EXISTS public.range_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  link_name TEXT,
  link_url TEXT,
  attachment_type TEXT NOT NULL DEFAULT 'file' CHECK (attachment_type IN ('file', 'link')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- 7. range_posts — links content (IndexedDB post IDs) to date_ranges
CREATE TABLE IF NOT EXISTS public.range_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  post_ref_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
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

-- ============================================================
-- DONE: Run this, then go to Supabase → API → and click
-- "Reload schema" if the schema cache error persists.
-- ============================================================
