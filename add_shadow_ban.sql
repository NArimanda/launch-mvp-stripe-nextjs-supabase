-- Shadow Ban Migration for Comments
-- This migration adds shadow banning functionality for comments only.

-- Step 1: Add is_banned column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Step 1.5: Add RLS policy for admins to read is_banned for all users
-- This allows admins to query the ban status of other users in the admin comments page
DROP POLICY IF EXISTS "Admins can read all users' ban status" ON public.users;
CREATE POLICY "Admins can read all users' ban status" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Step 2: Update the SELECT RLS policy for movie_comments
-- The policy should allow visibility of approved comments IF:
--   - comment author is NOT banned
--   OR
--   - viewer is admin
--   OR
--   - viewer is the comment author
-- Pending comments keep existing logic (visible to author and admins)

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "movie_comments_select_approved_or_owner_or_admin" ON public.movie_comments;

-- Create the updated SELECT policy with shadow ban logic
CREATE POLICY "movie_comments_select_approved_or_owner_or_admin" ON public.movie_comments
  FOR SELECT
  USING (
    -- Pending comments: visible to author or admins (existing logic)
    (approved = false AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )))
    OR
    -- Approved comments: visible if author is not banned, OR viewer is admin, OR viewer is the author
    (approved = true AND (
      -- Author is not banned
      NOT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = movie_comments.user_id AND u.is_banned = true
      )
      OR
      -- Viewer is admin
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.is_admin = true
      )
      OR
      -- Viewer is the comment author
      user_id = auth.uid()
    ))
  );

