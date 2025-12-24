-- Function to handle atomic bet placement transaction
-- This function deducts points from wallet and inserts the bet in a single transaction
CREATE OR REPLACE FUNCTION place_bet_transaction(
  p_user_id UUID,
  p_market_id UUID,
  p_selected_range TEXT,
  p_points INTEGER,
  p_potential_payout INTEGER,
  p_price_multiplier INTEGER,
  p_bin_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Deduct points from user's wallet
  UPDATE wallets 
  SET balance = balance - p_points 
  WHERE user_id = p_user_id AND balance >= p_points;
  
  -- Check if the update was successful (user had enough points)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient points or wallet not found';
  END IF;
  
  -- Insert the bet
  INSERT INTO bets (
    user_id,
    market_id,
    selected_range,
    points,
    potential_payout,
    price_multiplier,
    bin_id,
    status,
    outcome
  ) VALUES (
    p_user_id,
    p_market_id,
    p_selected_range,
    p_points,
    p_potential_payout,
    p_price_multiplier,
    p_bin_id,
    'pending',  -- Use 'pending' as the status
    'pending'   -- Set outcome to 'pending'
  );
  
END;
$$ LANGUAGE plpgsql;

-- Function to insert a movie comment
-- This function runs with SECURITY DEFINER to bypass RLS
-- User validation is performed in the route handler before calling this function
CREATE OR REPLACE FUNCTION insert_movie_comment(
  p_user_id UUID,
  p_movie_id UUID,
  p_body TEXT,
  p_parent_id UUID DEFAULT NULL,
  p_position_market_type TEXT DEFAULT NULL,
  p_position_selected_range TEXT DEFAULT NULL,
  p_position_points INTEGER DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  movie_id UUID,
  user_id UUID,
  parent_id UUID,
  body TEXT,
  approved BOOLEAN,
  created_at TIMESTAMPTZ,
  position_market_type TEXT,
  position_selected_range TEXT,
  position_points INTEGER
) AS $$
DECLARE
  v_comment_id UUID;
BEGIN
  -- Note: User validation is performed in the route handler before calling this function
  -- The route handler ensures the user is authenticated and passes the correct user_id

  -- Validate that the body is not empty
  IF p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'Comment body cannot be empty';
  END IF;

  -- Insert the comment
  INSERT INTO movie_comments (
    user_id,
    movie_id,
    parent_id,
    body,
    approved,
    position_market_type,
    position_selected_range,
    position_points
  ) VALUES (
    p_user_id,
    p_movie_id,
    p_parent_id,
    trim(p_body),
    false, -- Comments start as unapproved
    p_position_market_type,
    p_position_selected_range,
    p_position_points
  )
  RETURNING movie_comments.id INTO v_comment_id;

  -- Return the inserted comment
  RETURN QUERY
  SELECT 
    mc.id,
    mc.movie_id,
    mc.user_id,
    mc.parent_id,
    mc.body,
    mc.approved,
    mc.created_at,
    mc.position_market_type,
    mc.position_selected_range,
    mc.position_points
  FROM movie_comments mc
  WHERE mc.id = v_comment_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 