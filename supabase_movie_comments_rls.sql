-- Enable RLS on movie_comments table
ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own comments (with approved=false)
CREATE POLICY "Users can insert their own comments" ON public.movie_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read approved comments OR their own comments (pending or approved)
CREATE POLICY "Users can read approved or own comments" ON public.movie_comments
  FOR SELECT
  USING (
    approved = true 
    OR auth.uid() = user_id
  );

-- Policy: Admins can read all comments
CREATE POLICY "Admins can read all comments" ON public.movie_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can update any comment
CREATE POLICY "Admins can update any comment" ON public.movie_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can delete any comment
CREATE POLICY "Admins can delete any comment" ON public.movie_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Service role has full access (for server-side admin operations)
CREATE POLICY "Service role full access to movie_comments" ON public.movie_comments
  FOR ALL TO service_role USING (true);

