-- Add columns to public.users for daily comment tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS comments_per_day int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_day_utc date NULL;

-- Create function to enforce daily comment limit
CREATE OR REPLACE FUNCTION public.check_daily_comment_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_utc date;
  current_count int;
  current_day date;
BEGIN
  -- Compute today's UTC date
  today_utc := (now() AT TIME ZONE 'utc')::date;
  
  -- Lock and fetch user's current comment count and day (FOR UPDATE prevents race conditions)
  SELECT comments_per_day, comments_day_utc
  INTO current_count, current_day
  FROM public.users
  WHERE id = NEW.user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', NEW.user_id;
  END IF;
  
  -- Reset counter if day is different or null
  IF current_day IS NULL OR current_day != today_utc THEN
    current_count := 0;
    current_day := today_utc;
  END IF;
  
  -- Check if limit reached
  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Daily comment limit reached (5 per UTC day)';
  END IF;
  
  -- Increment counter and update day
  UPDATE public.users
  SET 
    comments_per_day = current_count + 1,
    comments_day_utc = today_utc
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_daily_comment_limit ON public.movie_comments;

-- Create trigger
CREATE TRIGGER enforce_daily_comment_limit
BEFORE INSERT ON public.movie_comments
FOR EACH ROW
EXECUTE FUNCTION public.check_daily_comment_limit();

