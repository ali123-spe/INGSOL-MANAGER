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
