import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input)
    .replace(/\u00A0/g, ' ')   // convert NBSP to regular space
    .replace(/\s+/g, ' ')      // collapse multiple spaces
    .trim();
  return s;
}

export default async function MoviePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const raw = normalizeSlug(params.slug);
  const candidateSlugs = Array.from(new Set([
    raw,
    raw.replace(/-/g, ' '),   // handle links that used hyphens
  ]));

  // Try to match any of the candidates
  const query = supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date,description")
    .in("slug", candidateSlugs)
    .limit(1);

  const { data: rows } = await query;
  let movie = rows?.[0];

  // Fallback: loose match on title if still not found
  if (!movie) {
    const { data: rows2 } = await supabase
      .from("movies")
      .select("id,slug,title,image_url,release_date,description")
      .ilike("title", raw)        // exact-ish, case-insensitive
      .limit(1);
    movie = rows2?.[0];
  }

  if (!movie) return notFound();

  const marketButtons = [
    { title: "Opening Day", timeframe: "opening-day" },
    { title: "Weekend", timeframe: "weekend" },
    { title: "Week", timeframe: "week" },
    { title: "Month", timeframe: "month" },
  ];

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <div className="flex gap-6">
        <div className="relative w-40 sm:w-56 aspect-[2/3] rounded-lg overflow-hidden bg-slate-100">
          <Image src={movie.image_url || "/posters/placeholder.jpg"} alt={movie.title} fill className="object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          {movie.release_date && (
            <p className="text-sm text-slate-600 mt-1">
              Releases {new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(movie.release_date))}
            </p>
          )}
          {movie.description && <p className="mt-3 text-slate-700 dark:text-slate-300">{movie.description}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Markets</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Domestic Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Domestic</h3>
            <div className="flex flex-col gap-3">
              {marketButtons.map((button) => (
                <Link
                  key={button.title}
                  href={`/movie/${movie.slug}/domestic/${button.timeframe}`}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  {button.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Worldwide Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Worldwide</h3>
            <div className="flex flex-col gap-3">
              {marketButtons.map((button) => (
                <Link
                  key={`worldwide-${button.title}`}
                  href={`/movie/${movie.slug}/worldwide/${button.timeframe}`}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  {button.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
