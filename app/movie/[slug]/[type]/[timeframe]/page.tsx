import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function formatTimeframeTitle(timeframe: string): string {
  const timeframeMap: { [key: string]: string } = {
    'opening-day': 'Opening Day',
    'weekend': 'Weekend',
    'week': 'Week',
    'month': 'Month',
  };
  
  return timeframeMap[timeframe] || timeframe;
}

function formatTypeTitle(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default async function MarketPage({ 
  params 
}: { 
  params: { slug: string; type: string; timeframe: string } 
}) {
  const supabase = createClient();
  const raw = normalizeSlug(params.slug);
  const type = params.type;
  const timeframe = params.timeframe;
  
  // Validate type and timeframe
  const validTypes = ['domestic', 'worldwide'];
  const validTimeframes = ['opening-day', 'weekend', 'week', 'month'];
  
  if (!validTypes.includes(type) || !validTimeframes.includes(timeframe)) {
    return notFound();
  }
  
  const { data: rows } = await supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .in("slug", [raw, raw.replace(/-/g, ' ')])
    .limit(1);

  const movie = rows?.[0];
  if (!movie) return notFound();

  const timeframeTitle = formatTimeframeTitle(timeframe);
  const typeTitle = formatTypeTitle(type);
  const fullTitle = `${movie.title} - ${timeframeTitle} ${typeTitle}`;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link 
          href={`/movie/${movie.slug}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to {movie.title}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {fullTitle}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
          {timeframeTitle} {typeTitle} Market Data
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          {typeTitle.toLowerCase()} market data will be displayed here when available.
        </p>
        
        {/* Debug info - you can remove this later */}
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700 rounded text-sm">
          <p><strong>Type:</strong> {type}</p>
          <p><strong>Timeframe:</strong> {timeframe}</p>
          <p><strong>Movie:</strong> {movie.title}</p>
        </div>
      </div>
    </div>
  );
} 