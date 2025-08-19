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