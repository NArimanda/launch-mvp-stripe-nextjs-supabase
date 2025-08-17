import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildBinsForMarket } from "@/lib/binPresets";
import MarketContentWrapper from "@/components/MarketContentWrapper";

type BetRow = { selected_bin_id: string | null; side: boolean | null; points: number | null };

interface Bin {
  bin_id: string;
  position: number;
  lower_cents: number;
  upper_cents: number | null;
  is_open_ended: boolean;
  label: string;
}

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function formatTimeframeTitle(tf: string) {
  const m: Record<string, string> = {
    "opening-day": "Opening Day",
    weekend: "Weekend",
    week: "Week",
    month: "Month",
  };
  return m[tf] ?? tf;
}
function formatTypeTitle(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function MarketPage({
  params,
}: {
  params: { slug: string; type: "domestic" | "worldwide"; timeframe: "opening-day" | "weekend" | "week" | "month" };
}) {
  const supabase = createClient();
  const raw = normalizeSlug(params.slug);
  const type = params.type;
  const timeframe = params.timeframe;

  // validate params
  const validTypes = ["domestic", "worldwide"] as const;
  const validTF = ["opening-day", "weekend", "week", "month"] as const;
  if (!validTypes.includes(type) || !validTF.includes(timeframe)) return notFound();

  // movie
  const { data: movies } = await supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .in("slug", [raw, raw.replace(/-/g, " ")])
    .limit(1);

  const movie = movies?.[0];
  if (!movie) return notFound();

  // market
  const { data: market } = await supabase
    .from("markets")
    .select("id, type, timeframe, status, end_time")
    .eq("movie_id", movie.id)
    .eq("type", type)
    .eq("timeframe", timeframe)
    .maybeSingle();

  if (!market) return notFound();

  // bins (from code, not DB)
  const bins = buildBinsForMarket({ marketId: market.id, type, timeframe });

  // lightweight stats grouped in code
  const { data: rawBets } = await supabase
    .from("bets")
    .select("selected_bin_id, side, points")
    .eq("market_id", market.id);

  const byBin = new Map<string, { selected_bin_id: string; total_bets: number; total_points: number; yes_bets: number; no_bets: number }>();
  for (const b of (rawBets || []) as BetRow[]) {
    const id = b.selected_bin_id ?? ""; // should match `${market.id}:${position}`
    if (!id) continue;
    if (!byBin.has(id)) byBin.set(id, { selected_bin_id: id, total_bets: 0, total_points: 0, yes_bets: 0, no_bets: 0 });
    const agg = byBin.get(id)!;
    agg.total_bets += 1;
    agg.total_points += Number(b.points || 0);
    if (b.side === true) agg.yes_bets += 1;
    if (b.side === false) agg.no_bets += 1;
  }
  const stats = bins.map((b: Bin) => byBin.get(b.bin_id) ?? ({
    selected_bin_id: b.bin_id,
    total_bets: 0,
    total_points: 0,
    yes_bets: 0,
    no_bets: 0
  }));

  const title = `${movie.title} — ${formatTimeframeTitle(timeframe)} ${formatTypeTitle(type)}`;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/movie/${movie.slug}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block">
          ← Back to {movie.title}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Market status: <span className="font-medium">{market.status}</span>
          {market.end_time ? ` • Ends ${new Date(market.end_time).toLocaleString()}` : ""}
        </p>
      </div>

      <MarketContentWrapper marketId={market.id} bins={bins} stats={stats} />
    </div>
  );
}
