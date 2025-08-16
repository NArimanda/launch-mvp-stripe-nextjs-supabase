// app/movie/[slug]/market/[type]/[timeframe]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function formatTimeframeTitle(timeframe: string): string {
  const timeframeMap: Record<string, string> = {
    "opening-day": "Opening Day",
    weekend: "Weekend",
    week: "Week",
    month: "Month",
  };
  return timeframeMap[timeframe] || timeframe;
}

function formatTypeTitle(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// URL -> DB mappings (adjust if your DB stores different strings)
const VALID_TYPES = new Set(["domestic", "worldwide"]);
const VALID_TFS = new Set(["opening-day", "weekend", "week", "month"]);

export default async function MarketPage({
  params,
}: {
  params: { slug: string; type: string; timeframe: string };
}) {
  const supabase = createClient();

  // Validate URL params early
  const uiType = params.type;
  const uiTF = params.timeframe;
  if (!VALID_TYPES.has(uiType) || !VALID_TFS.has(uiTF)) return notFound();

  // Fetch movie (support dashed or spaced slug)
  const raw = normalizeSlug(params.slug);
  const { data: movies, error: movieErr } = await supabase
    .from("movies")
    .select("id, slug, title, image_url, release_date")
    .in("slug", [raw, raw.replace(/-/g, " ")])
    .limit(1);

  if (movieErr) throw new Error(movieErr.message);
  const movie = movies?.[0];
  if (!movie) return notFound();

  // Fetch the market that matches this movie + type + timeframe
  // markets columns assumed: id, movie_id, type, timeframe, end_time, status, prediction, outcome
  const { data: market, error: marketErr } = await supabase
    .from("markets")
    .select("id, movie_id, type, timeframe, end_time, status, prediction, outcome")
    .eq("movie_id", movie.id)
    .eq("type", uiType)            // DB stores 'domestic' | 'worldwide'
    .eq("timeframe", uiTF)         // DB stores 'opening-day' | 'weekend' | 'week' | 'month'
    .maybeSingle();

  if (marketErr) throw new Error(marketErr.message);
  if (!market) return notFound();

  const timeframeTitle = formatTimeframeTitle(uiTF);
  const typeTitle = formatTypeTitle(uiType);
  const fullTitle = `${movie.title} - ${timeframeTitle} ${typeTitle}`;

  const closesAt = market.end_time ? new Date(market.end_time) : null;
  const isOpen = market.status === "open";
  const isSettled = market.status === "settled";

  // helpers to display numeric-ish fields nicely
  const asCurrency = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? `$${n.toLocaleString()}` : "—";
  };

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/movie/${movie.slug}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to {movie.title}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{fullTitle}</h1>
        {closesAt && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Closes: {closesAt.toLocaleString()}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-6">
        {/* Market status pill */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">Status</div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              isOpen
                ? "bg-green-100 text-green-700"
                : isSettled
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {market.status}
          </div>
        </div>

        {/* Prediction (if you compute an implied or mean prediction) */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-slate-500 mb-1">Current Market Prediction</div>
          <div className="text-xl font-semibold">
            {asCurrency(market.prediction)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {(uiType === "domestic" ? "Domestic" : "Worldwide")} gross, {timeframeTitle.toLowerCase()}
          </div>
        </div>

        {/* Place bet (when open) OR Outcome (when settled) */}
        {isOpen ? (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Place your bet</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Select a gross range and stake points. (Bet UI coming next.)
            </p>
            {/* TODO: <BetForm marketId={market.id} /> */}
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Outcome</h3>
            <div className="text-xl font-semibold">{asCurrency(market.outcome)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Final {uiType === "domestic" ? "Domestic" : "Worldwide"} gross — {timeframeTitle}
            </div>
          </div>
        )}

        {/* Dev/debug info — remove later */}
        <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-700 rounded text-xs space-y-1">
          <div><b>movie_id:</b> {movie.id}</div>
          <div><b>market_id:</b> {market.id}</div>
          <div><b>type:</b> {market.type}</div>
          <div><b>timeframe:</b> {market.timeframe}</div>
          <div><b>end_time:</b> {market.end_time}</div>
        </div>
      </div>
    </div>
  );
}
