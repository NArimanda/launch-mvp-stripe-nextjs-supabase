import { notFound } from "next/navigation";
import Link from "next/link";
import MarketContentWrapper from "@/components/MarketContentWrapper";
import CountdownTimer from "@/components/CountdownTimer";
import MovieComments from "@/components/comments/MovieComments";
import UnresolveMarketButton from "@/components/UnresolveMarketButton";
import ResolveMarketForm from "@/components/ResolveMarketForm";
import { getMarketPageData } from "@/lib/data/market";

export const revalidate = 30;

function formatTimeframeTitle(tf: string) {
  const m: Record<string, string> = {
    weekend: "Weekend",
    month: "Month",
  };
  return m[tf] ?? tf;
}
function formatTypeTitle(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function getMarketSubtitle(timeframe: string, type: string): string {
  if (timeframe === "weekend") return "Opening Weekend (Worldwide)";
  if (timeframe === "month") return "First Month (Worldwide)";
  return `${formatTimeframeTitle(timeframe)} (${formatTypeTitle(type)})`;
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string; type: "worldwide"; timeframe: "weekend" | "month" }>;
}) {
  const { slug, type, timeframe } = await params;

  const validTypes = ["worldwide"] as const;
  const validTF = ["weekend", "month"] as const;
  if (!validTypes.includes(type) || !validTF.includes(timeframe)) return notFound();

  const data = await getMarketPageData(slug, type, timeframe);
  if (!data) return notFound();

  const { movie, market, bins, stats } = data;
  const marketSubtitle = getMarketSubtitle(timeframe, type);

  return (
    <div className="min-h-screen bg-cinema-page px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/movie/${movie.slug}`} className="text-cinema-accent hover:text-cinema-accentWarm mb-4 inline-block">
          ← Back to {movie.title}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cinema-text">{movie.title}</h1>
            <p className="text-lg text-cinema-textMuted mt-1">{marketSubtitle}</p>
            <p className="text-sm text-cinema-textMuted mt-1">
              Market status: <span className="font-medium text-cinema-text">{market.status}</span>
              {market.end_time ? ` • Ends ${new Date(market.end_time).toLocaleString()}` : ""}
            </p>
          </div>
          <CountdownTimer closeTime={market.close_time} marketStatus={market.status} />
        </div>
      </div>

      <MarketContentWrapper marketId={market.id} bins={bins} stats={stats} type={type} timeframe={timeframe} marketStatus={market.status} />

      <div className="mb-8">
        <UnresolveMarketButton marketId={market.id} marketStatus={market.status} />
        <ResolveMarketForm marketId={market.id} marketStatus={market.status} />
      </div>

      <MovieComments movieId={movie.id} />
    </div>
  );
}
