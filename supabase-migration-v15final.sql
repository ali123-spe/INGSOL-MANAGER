-- ============================================================
-- INGSOL MANAGER V1.5 FINAL ARCHITECTURE MIGRATION
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ── 1. date_ranges (campaigns) — create if missing, add missing columns ──────
CREATE TABLE IF NOT EXISTS public.date_ranges (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name             TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  description      TEXT,
  color            TEXT DEFAULT '#024791',
  status           TEXT NOT NULL DEFAULT 'Planned',
  source_reference_url TEXT,
  internal_notes   TEXT,
  tags             TEXT[],
  actual_start_at  TIMESTAMP WITH TIME ZONE,
  completed_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT date_ranges_end_after_start CHECK (end_date >= start_date)
);

-- Add missing columns to date_ranges if table already exists
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Planned';
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS source_reference_url TEXT;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Indexes for date_ranges
CREATE INDEX IF NOT EXISTS idx_date_ranges_user_id  ON public.date_ranges(user_id);
CREATE INDEX IF NOT EXISTS idx_date_ranges_start    ON public.date_ranges(start_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_end      ON public.date_ranges(end_date);
CREATE INDEX IF NOT EXISTS idx_date_ranges_status   ON public.date_ranges(status);

-- RLS for date_ranges
ALTER TABLE public.date_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own date ranges"   ON public.date_ranges;
DROP POLICY IF EXISTS "Users can insert own date ranges" ON public.date_ranges;
DROP POLICY IF EXISTS "Users can update own date ranges" ON public.date_ranges;
DROP POLICY IF EXISTS "Users can delete own date ranges" ON public.date_ranges;

CREATE POLICY "Users can view own date ranges"
  ON public.date_ranges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own date ranges"
  ON public.date_ranges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own date ranges"
  ON public.date_ranges FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own date ranges"
  ON public.date_ranges FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger for date_ranges
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


-- ── 2. range_attachments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.range_attachments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id        UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  file_id         UUID REFERENCES public.files(id) ON DELETE SET NULL,
  link_name       TEXT,
  link_url        TEXT,
  attachment_type TEXT NOT NULL DEFAULT 'file' CHECK (attachment_type IN ('file', 'link')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_range_attachments_range_id ON public.range_attachments(range_id);

ALTER TABLE public.range_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own range attachments"   ON public.range_attachments;
DROP POLICY IF EXISTS "Users can insert own range attachments" ON public.range_attachments;
DROP POLICY IF EXISTS "Users can delete own range attachments" ON public.range_attachments;

CREATE POLICY "Users can view own range attachments"
  ON public.range_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own range attachments"
  ON public.range_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own range attachments"
  ON public.range_attachments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));


-- ── 3. content — new V1.5 content table (separate from IndexedDB posts) ──────
CREATE TABLE IF NOT EXISTS public.content (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title                TEXT NOT NULL,
  content_type         TEXT NOT NULL DEFAULT 'Other',
  start_date           DATE,
  end_date             DATE,
  status               TEXT NOT NULL DEFAULT 'Draft',
  distribution_channel TEXT,
  description          TEXT,
  source_reference_url TEXT,
  internal_notes       TEXT,
  tags                 TEXT[],
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_owner_id   ON public.content(owner_id);
CREATE INDEX IF NOT EXISTS idx_content_start_date ON public.content(start_date);
CREATE INDEX IF NOT EXISTS idx_content_status     ON public.content(status);

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own content"   ON public.content;
DROP POLICY IF EXISTS "Users can insert own content" ON public.content;
DROP POLICY IF EXISTS "Users can update own content" ON public.content;
DROP POLICY IF EXISTS "Users can delete own content" ON public.content;

CREATE POLICY "Users can view own content"
  ON public.content FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own content"
  ON public.content FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own content"
  ON public.content FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own content"
  ON public.content FOR DELETE USING (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS content_updated_at ON public.content;
CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- ── 4. content_attachments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_attachments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id      UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  file_id         UUID REFERENCES public.files(id) ON DELETE SET NULL,
  link_name       TEXT,
  link_url        TEXT,
  attachment_type TEXT NOT NULL DEFAULT 'file' CHECK (attachment_type IN ('file', 'link')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_attachments_content_id ON public.content_attachments(content_id);

ALTER TABLE public.content_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own content attachments"   ON public.content_attachments;
DROP POLICY IF EXISTS "Users can insert own content attachments" ON public.content_attachments;
DROP POLICY IF EXISTS "Users can delete own content attachments" ON public.content_attachments;

CREATE POLICY "Users can view own content attachments"
  ON public.content_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.content WHERE id = content_id AND owner_id = auth.uid()));

CREATE POLICY "Users can insert own content attachments"
  ON public.content_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.content WHERE id = content_id AND owner_id = auth.uid()));

CREATE POLICY "Users can delete own content attachments"
  ON public.content_attachments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.content WHERE id = content_id AND owner_id = auth.uid()));


-- ── 5. campaign_content — links campaigns to content items ───────────────────
CREATE TABLE IF NOT EXISTS public.campaign_content (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  content_id  UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(campaign_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign_id ON public.campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_content_id  ON public.campaign_content(content_id);

ALTER TABLE public.campaign_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own campaign content"   ON public.campaign_content;
DROP POLICY IF EXISTS "Users can insert own campaign content" ON public.campaign_content;
DROP POLICY IF EXISTS "Users can delete own campaign content" ON public.campaign_content;

CREATE POLICY "Users can view own campaign content"
  ON public.campaign_content FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own campaign content"
  ON public.campaign_content FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own campaign content"
  ON public.campaign_content FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = campaign_id AND user_id = auth.uid()));


-- ── 6. range_posts — legacy: links IndexedDB post IDs to campaigns ───────────
CREATE TABLE IF NOT EXISTS public.range_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id    UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  post_ref_id TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
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
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own range posts"
  ON public.range_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own range posts"
  ON public.range_posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.date_ranges WHERE id = range_id AND user_id = auth.uid()));


-- ── 7. files table — add mime_type if missing ────────────────────────────────
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ============================================================
-- DONE. After running this, if you still see a schema cache
-- error, go to: Supabase Dashboard → Settings → API and click
-- "Reload schema cache" or toggle off/on the project.
-- ============================================================
