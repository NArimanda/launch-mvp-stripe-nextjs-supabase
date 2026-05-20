import { buildBinsForMarket } from '@/lib/binPresets';
import { createPublicSupabase } from '@/utils/supabase/public';
import { getMovieBySlug } from '@/lib/data/movies';

type BetRow = { selected_bin_id: string | null; side: boolean | null; points: number | null };

export interface MarketBinStat {
  selected_bin_id: string;
  total_bets: number;
  total_points: number;
  yes_bets: number;
  no_bets: number;
}

export interface MarketPageData {
  movie: {
    id: string;
    slug: string;
    title: string;
    image_url: string | null;
    release_date: string | null;
  };
  market: {
    id: string;
    type: string;
    timeframe: string;
    status: string;
    end_time: string | null;
    close_time: string | null;
  };
  bins: ReturnType<typeof buildBinsForMarket>;
  stats: MarketBinStat[];
}

export async function getMarketPageData(
  slugParam: string,
  type: 'worldwide',
  timeframe: 'weekend' | 'month',
): Promise<MarketPageData | null> {
  const movie = await getMovieBySlug(slugParam);
  if (!movie) return null;

  const supabase = createPublicSupabase();
  const { data: market } = await supabase
    .from('markets')
    .select('id, type, timeframe, status, end_time, close_time')
    .eq('movie_id', movie.id)
    .eq('type', type)
    .eq('timeframe', timeframe)
    .maybeSingle();

  if (!market) return null;

  const bins = buildBinsForMarket({ marketId: market.id, type, timeframe });

  const { data: rawBets } = await supabase
    .from('bets')
    .select('selected_bin_id, side, points')
    .eq('market_id', market.id);

  const byBin = new Map<string, MarketBinStat>();
  for (const b of (rawBets || []) as BetRow[]) {
    const id = b.selected_bin_id ?? '';
    if (!id) continue;
    if (!byBin.has(id)) {
      byBin.set(id, { selected_bin_id: id, total_bets: 0, total_points: 0, yes_bets: 0, no_bets: 0 });
    }
    const agg = byBin.get(id)!;
    agg.total_bets += 1;
    agg.total_points += Number(b.points || 0);
    if (b.side === true) agg.yes_bets += 1;
    if (b.side === false) agg.no_bets += 1;
  }

  const stats = bins.map((b) =>
    byBin.get(b.bin_id) ?? {
      selected_bin_id: b.bin_id,
      total_bets: 0,
      total_points: 0,
      yes_bets: 0,
      no_bets: 0,
    },
  );

  return {
    movie: {
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      image_url: movie.image_url,
      release_date: movie.release_date,
    },
    market,
    bins,
    stats,
  };
}
