-- Create hero_articles table
CREATE TABLE IF NOT EXISTS public.hero_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_path text, -- path in Supabase Storage
  href text NOT NULL, -- external article URL
  kicker text, -- optional label
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_hero_articles_updated_at ON public.hero_articles;
CREATE TRIGGER set_hero_articles_updated_at
  BEFORE UPDATE ON public.hero_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.hero_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read hero articles
DROP POLICY IF EXISTS "Public can read hero articles" ON public.hero_articles;
CREATE POLICY "Public can read hero articles" ON public.hero_articles
  FOR SELECT
  TO public
  USING (true);

-- RLS Policy: Admins can insert hero articles
DROP POLICY IF EXISTS "Admins can insert hero articles" ON public.hero_articles;
CREATE POLICY "Admins can insert hero articles" ON public.hero_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- RLS Policy: Admins can update hero articles
DROP POLICY IF EXISTS "Admins can update hero articles" ON public.hero_articles;
CREATE POLICY "Admins can update hero articles" ON public.hero_articles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- RLS Policy: Admins can delete hero articles
DROP POLICY IF EXISTS "Admins can delete hero articles" ON public.hero_articles;
CREATE POLICY "Admins can delete hero articles" ON public.hero_articles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Create public bucket for hero images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-images',
  'hero-images',
  true, -- public bucket
  10485760, -- 10MB limit (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760;

-- Storage RLS Policies for hero-images bucket (public bucket, but restrict uploads to admins)

-- Policy: Allow admins to INSERT (upload) images
DROP POLICY IF EXISTS "Admins can upload hero images" ON storage.objects;
CREATE POLICY "Admins can upload hero images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hero-images'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Policy: Allow admins to UPDATE images
DROP POLICY IF EXISTS "Admins can update hero images" ON storage.objects;
CREATE POLICY "Admins can update hero images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'hero-images'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'hero-images'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Policy: Allow admins to DELETE images
DROP POLICY IF EXISTS "Admins can delete hero images" ON storage.objects;
CREATE POLICY "Admins can delete hero images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hero-images'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Note: Public SELECT is handled by the bucket being public=true
