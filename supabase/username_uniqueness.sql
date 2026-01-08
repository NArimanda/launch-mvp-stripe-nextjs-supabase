-- Username Uniqueness and Index Migration
-- Ensures usernames are unique and indexed for fast lookups

-- Add unique constraint on username (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END $$;

-- Create index on username for fast lookups (idempotent)
CREATE INDEX IF NOT EXISTS users_username_idx 
ON public.users (username) 
WHERE username IS NOT NULL;

