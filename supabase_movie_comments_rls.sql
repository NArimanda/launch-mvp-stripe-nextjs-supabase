-- Enable RLS on movie_comments table
ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own comments (with approved=false)
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.movie_comments;
CREATE POLICY "Users can insert their own comments" ON public.movie_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- STEP 1: Drop ALL existing SELECT policies to ensure clean state
-- Drop all known SELECT policy names
DROP POLICY IF EXISTS "Users can read approved or own comments" ON public.movie_comments;
DROP POLICY IF EXISTS "Admins can read all comments" ON public.movie_comments;
DROP POLICY IF EXISTS "movie_comments_select_own_or_approved_or_admin" ON public.movie_comments;
DROP POLICY IF EXISTS "movie_comments_select_approved_or_admin" ON public.movie_comments;
DROP POLICY IF EXISTS "TEMP_allow_all_select" ON public.movie_comments;

-- Also drop any other SELECT policies that might exist (defensive)
-- Note: This query lists all SELECT policies, but we can't dynamically drop them in a single migration
-- The above DROP statements should cover all known cases

-- STEP 2: Create the SINGLE correct SELECT policy
-- Name: movie_comments_select_approved_or_owner_or_admin
-- Condition: approved = true OR user_id = auth.uid() OR is_admin = true
DROP POLICY IF EXISTS "movie_comments_select_approved_or_owner_or_admin" ON public.movie_comments;
CREATE POLICY "movie_comments_select_approved_or_owner_or_admin" ON public.movie_comments
  FOR SELECT
  USING (
    approved = true
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Policy: Admins can update any comment
DROP POLICY IF EXISTS "Admins can update any comment" ON public.movie_comments;
CREATE POLICY "Admins can update any comment" ON public.movie_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Admins can delete any comment
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.movie_comments;
CREATE POLICY "Admins can delete any comment" ON public.movie_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Service role has full access (for server-side admin operations)
DROP POLICY IF EXISTS "Service role full access to movie_comments" ON public.movie_comments;
CREATE POLICY "Service role full access to movie_comments" ON public.movie_comments
  FOR ALL TO service_role USING (true);






