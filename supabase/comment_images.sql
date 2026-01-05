-- Create private bucket for comment images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-images',
  'comment-images',
  false, -- private bucket
  3145728, -- 3MB limit (3 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Add image columns to movie_comments table
ALTER TABLE public.movie_comments
ADD COLUMN IF NOT EXISTS image_path text null,
ADD COLUMN IF NOT EXISTS image_mime text null,
ADD COLUMN IF NOT EXISTS image_size integer null;

-- Storage RLS Policies for comment-images bucket

-- Policy: Allow authenticated users to INSERT into paths starting with their user_id
-- Note: Service role bypasses RLS, so it can always upload
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
CREATE POLICY "Users can upload to their own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to SELECT (read) objects in their own folder or if they're admins
DROP POLICY IF EXISTS "Users can read their own images or admins can read all" ON storage.objects;
CREATE POLICY "Users can read their own images or admins can read all" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comment-images' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.is_admin = true
      )
    )
  );

-- Policy: Allow authenticated users to UPDATE objects in their own folder
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'comment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'comment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to DELETE objects in their own folder
-- Also allow admins to delete any object in the bucket
DROP POLICY IF EXISTS "Users can delete their own images or admins can delete any" ON storage.objects;
CREATE POLICY "Users can delete their own images or admins can delete any" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comment-images' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.is_admin = true
      )
    )
  );

