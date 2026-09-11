-- Supabase Schema for INGSOL Manager V1.5

-- 1. Create Profiles Table (Linked to Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);


-- 2. Create Files Table for metadata
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_filename TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files" 
ON public.files FOR SELECT 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert own files" 
ON public.files FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own files" 
ON public.files FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own files" 
ON public.files FOR DELETE 
USING (auth.uid() = uploaded_by);


-- 3. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Set up Storage (Run this block, or create bucket 'manager_files' in the dashboard)
-- NOTE: Storage setup via SQL requires proper permissions. Creating it in the Supabase Dashboard is often easier.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('manager_files', 'manager_files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage Bucket
CREATE POLICY "Users can read own storage files"
ON storage.objects FOR SELECT
USING (auth.uid() = owner AND bucket_id = 'manager_files');

CREATE POLICY "Users can upload own storage files"
ON storage.objects FOR INSERT
WITH CHECK (auth.uid() = owner AND bucket_id = 'manager_files');

CREATE POLICY "Users can update own storage files"
ON storage.objects FOR UPDATE
USING (auth.uid() = owner AND bucket_id = 'manager_files');

CREATE POLICY "Users can delete own storage files"
ON storage.objects FOR DELETE
USING (auth.uid() = owner AND bucket_id = 'manager_files');


-- ============================================================
-- PROMPT 2 ADDITIONS — Date Ranges / Campaigns + Attachments
-- ============================================================

-- 5. Add mime_type to files table (run if table already exists)
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS mime_type TEXT;


-- 6. Date Ranges / Campaigns table
CREATE TABLE IF NOT EXISTS public.date_ranges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#024791',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_date_ranges_user_id ON public.date_ranges(user_id);
CREATE INDEX IF NOT EXISTS idx_date_ranges_dates ON public.date_ranges(start_date, end_date);

ALTER TABLE public.date_ranges ENABLE ROW LEVEL SECURITY;

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

-- Auto-update updated_at on date_ranges
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER date_ranges_updated_at
  BEFORE UPDATE ON public.date_ranges
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- 7. Range Attachments (files and links attached to a date range)
-- Each row is either a file (file_id set) or a link (link_url set), not both.
CREATE TABLE IF NOT EXISTS public.range_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  -- File attachment columns (nullable when it's a link)
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  -- Link attachment columns (nullable when it's a file)
  link_name TEXT,
  link_url TEXT,
  -- Type discriminator: 'file' or 'link'
  attachment_type TEXT NOT NULL DEFAULT 'file' CHECK (attachment_type IN ('file', 'link')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_range_attachments_range_id ON public.range_attachments(range_id);
CREATE INDEX IF NOT EXISTS idx_range_attachments_file_id ON public.range_attachments(file_id);

ALTER TABLE public.range_attachments ENABLE ROW LEVEL SECURITY;

-- Users can access range_attachments if they own the parent date_range
CREATE POLICY "Users can view own range attachments"
ON public.range_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
    AND date_ranges.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own range attachments"
ON public.range_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
    AND date_ranges.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own range attachments"
ON public.range_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_attachments.range_id
    AND date_ranges.user_id = auth.uid()
  )
);


-- 8. Range Posts — join between date_ranges and IndexedDB post IDs
-- post_ref_id is the string ID from IndexedDB (no FK needed)
CREATE TABLE IF NOT EXISTS public.range_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id UUID REFERENCES public.date_ranges(id) ON DELETE CASCADE NOT NULL,
  post_ref_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(range_id, post_ref_id)
);

CREATE INDEX IF NOT EXISTS idx_range_posts_range_id ON public.range_posts(range_id);

ALTER TABLE public.range_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own range posts"
ON public.range_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
    AND date_ranges.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own range posts"
ON public.range_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
    AND date_ranges.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own range posts"
ON public.range_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.date_ranges
    WHERE date_ranges.id = range_posts.range_id
    AND date_ranges.user_id = auth.uid()
  )
);

-- ============================================================
-- PROMPT 3 ADDITIONS — Work Status & Timestamp Tracking
-- ============================================================

-- Add status and tracking timestamps to date_ranges
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Planned';
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.date_ranges ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
