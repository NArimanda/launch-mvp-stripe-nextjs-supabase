import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import MovieComments from "@/components/comments/MovieComments";

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input)
    .replace(/\u00A0/g, ' ')   // convert NBSP to regular space
    .replace(/\s+/g, ' ')      // collapse multiple spaces
    .trim();
  return s;
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const raw = normalizeSlug(slug);
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
    { title: "Weekend", timeframe: "weekend" },
    { title: "Month", timeframe: "month" },
  ];

  return (
    <div className="min-h-screen bg-cinema-page px-4 py-6 max-w-5xl mx-auto">
      <div className="flex gap-6">
        <div className="relative w-40 sm:w-56 aspect-[2/3] rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
          <Image src={movie.image_url || "/posters/placeholder.jpg"} alt={movie.title} fill className="object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-cinema-text">{movie.title}</h1>
          {movie.release_date && (
            <p className="text-sm text-cinema-textMuted mt-1">
              Releases {(() => {
                const [year, month, day] = movie.release_date.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
              })()}
            </p>
          )}
          {movie.description && <p className="mt-3 text-cinema-textMuted">{movie.description}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-cinema-text mb-4">Markets</h2>
        
        <div>
          <h3 className="text-xl font-semibold mb-4 text-cinema-text">Worldwide</h3>
          <div className="flex flex-col gap-3">
            {marketButtons.map((button) => (
              <Link
                key={`worldwide-${button.title}`}
                href={`/movie/${movie.slug}/worldwide/${button.timeframe}`}
                className="bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors duration-200 shadow-cinema-card hover:shadow-cinema-card-hover"
              >
                {button.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MovieComments movieId={movie.id} />
    </div>
  );
}
