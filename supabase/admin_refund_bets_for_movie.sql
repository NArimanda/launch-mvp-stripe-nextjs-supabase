-- Atomic refund of bet stakes + delete bets for all markets of a movie.
-- Deletes bets BEFORE crediting wallets within one transaction so readers never see
-- balance + locked stakes double-counted (Total Value / author_total_value).
-- Invoke only from the app with service role after admin checks and unresolve_market.

CREATE OR REPLACE FUNCTION public.admin_refund_bets_for_movie(p_movie_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DROP TABLE IF EXISTS _movie_refund_staging;
  CREATE TEMP TABLE _movie_refund_staging (
    user_id uuid NOT NULL PRIMARY KEY,
    amt numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  INSERT INTO _movie_refund_staging (user_id, amt)
  SELECT
    b.user_id,
    COALESCE(SUM(b.points::numeric), 0)
  FROM public.bets b
  INNER JOIN public.markets m ON m.id = b.market_id
  WHERE m.movie_id = p_movie_id
  GROUP BY b.user_id;

  DELETE FROM public.bets b
  USING public.markets m
  WHERE b.market_id = m.id
    AND m.movie_id = p_movie_id;

  UPDATE public.wallets w
  SET balance = w.balance + s.amt
  FROM _movie_refund_staging s
  WHERE w.user_id = s.user_id
    AND s.amt > 0;

  INSERT INTO public.wallets (user_id, balance)
  SELECT s.user_id, s.amt
  FROM _movie_refund_staging s
  WHERE s.amt > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.user_id = s.user_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_refund_bets_for_movie(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_refund_bets_for_movie(uuid) TO service_role;
