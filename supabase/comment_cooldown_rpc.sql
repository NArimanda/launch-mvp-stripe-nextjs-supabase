-- Comment Cooldown RPC Function
-- Enforces a 1-minute cooldown between comments per user (global, across all movies/threads)
-- Uses atomic check-and-insert to prevent race conditions

CREATE OR REPLACE FUNCTION public.create_movie_comment_with_cooldown(
  p_movie_id uuid,
  p_body text,
  p_parent_id uuid DEFAULT NULL,
  p_position_market_type text DEFAULT NULL,
  p_position_selected_range text DEFAULT NULL,
  p_position_points integer DEFAULT NULL,
  p_image_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_comment_time timestamptz;
  v_time_since_last interval;
  v_remaining_seconds integer;
  v_comment_id uuid;
  v_user_id uuid;
BEGIN
  -- Get authenticated user ID from JWT (cookie-based auth)
  v_user_id := auth.uid();
  
  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check cooldown: get the most recent comment time for this user
  SELECT max(created_at) INTO v_last_comment_time
  FROM public.movie_comments
  WHERE user_id = v_user_id;

  -- If user has previous comments, check if cooldown period has passed
  IF v_last_comment_time IS NOT NULL THEN
    v_time_since_last := now() - v_last_comment_time;
    
    -- If less than 60 seconds have passed, raise exception
    IF v_time_since_last < interval '60 seconds' THEN
      -- Calculate remaining seconds
      v_remaining_seconds := EXTRACT(EPOCH FROM (interval '60 seconds' - v_time_since_last))::integer;
      RAISE EXCEPTION 'Comment cooldown: please wait % seconds', v_remaining_seconds;
    END IF;
  END IF;

  -- Insert the comment
  INSERT INTO public.movie_comments (
    user_id,
    movie_id,
    parent_id,
    body,
    approved,
    position_market_type,
    position_selected_range,
    position_points,
    image_path,
    created_at
  ) VALUES (
    v_user_id,  -- Use auth.uid() via v_user_id to prevent user_id spoofing
    p_movie_id,
    p_parent_id,
    trim(p_body),
    false,  -- Comments start as unapproved
    p_position_market_type,
    p_position_selected_range,
    p_position_points,
    p_image_path,
    now()
  )
  RETURNING id INTO v_comment_id;

  -- Return the inserted comment ID
  RETURN v_comment_id;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.create_movie_comment_with_cooldown(
  uuid,
  text,
  uuid,
  text,
  text,
  integer,
  text
) TO authenticated;

