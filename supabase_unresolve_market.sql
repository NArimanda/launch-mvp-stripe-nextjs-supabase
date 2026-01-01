-- Improved unresolve_market function with better error handling
CREATE OR REPLACE FUNCTION public.unresolve_market(p_market_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_admin boolean;
  v_market_status text;
  v_wallet_updates integer;
BEGIN
  -- Get the current user ID from JWT
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please sign in.';
  END IF;

  -- Check admin status
  SELECT COALESCE(u.is_admin, false)
    INTO v_admin
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Not authorized. Admin privileges required.';
  END IF;

  -- Verify market exists and is resolved
  SELECT status
    INTO v_market_status
  FROM public.markets
  WHERE id = p_market_id;

  IF v_market_status IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market_status != 'resolved' THEN
    RAISE EXCEPTION 'Market is not resolved. Current status: %', v_market_status;
  END IF;

  -- Check if any wallets would go negative BEFORE reversing (safety check)
  IF EXISTS (
    SELECT 1
    FROM public.wallets w
    JOIN public.bets b ON b.user_id = w.user_id
    WHERE b.market_id = p_market_id
      AND b.outcome = 'won'
      AND COALESCE(b.settled_payout_points, 0) > 0
      AND w.balance < COALESCE(b.settled_payout_points, 0)
  ) THEN
    RAISE EXCEPTION 'Cannot unresolve: reversing payouts would result in negative wallet balances';
  END IF;

  -- 1) Reverse wallet credits for winning bets (based on current stored outcomes)
  -- Only subtract for bets currently marked as 'won' and where settled_payout_points > 0
  UPDATE public.wallets w
     SET balance = w.balance - COALESCE(b.settled_payout_points, 0)
    FROM public.bets b
   WHERE b.market_id = p_market_id
     AND b.outcome = 'won'
     AND b.user_id = w.user_id
     AND COALESCE(b.settled_payout_points, 0) > 0;

  GET DIAGNOSTICS v_wallet_updates = ROW_COUNT;

  -- 2) Reset bets to "unresolved" state
  UPDATE public.bets
     SET outcome = NULL,
         settled_payout_points = 0
   WHERE market_id = p_market_id;

  -- 3) Reset market
  UPDATE public.markets
     SET status = 'open',
         outcome = NULL
   WHERE id = p_market_id;

  -- Log success (optional - can be removed if not needed)
  RAISE NOTICE 'Market % unresolved successfully. Reversed % wallet credits.', p_market_id, v_wallet_updates;

END;
$$;

-- Revoke and grant permissions
REVOKE ALL ON FUNCTION public.unresolve_market(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.unresolve_market(uuid) TO authenticated;

