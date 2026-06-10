import { notFound } from "next/navigation";
import Link from "next/link";
import MovieComments from "@/components/comments/MovieComments";
import AdminDeleteMovieGate from "@/components/movies/AdminDeleteMovieGate";
import { getMovieBySlug } from "@/lib/data/movies";

export const revalidate = 300;

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) return notFound();

  const marketButtons = [
    { title: "Opening Weekend", timeframe: "weekend" },
    { title: "First Month", timeframe: "month" },
  ];

  return (
    <div className="min-h-screen bg-cinema-page px-4 py-6 max-w-5xl mx-auto">
      <div className="flex gap-6">
        <div className="relative w-40 sm:w-56 aspect-[2/3] rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase posters are pre-sized; skip Vercel optimization */}
          <img
            src={movie.image_url || "/posters/placeholder.jpg"}
            alt={movie.title}
            width={260}
            height={384}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
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
          <AdminDeleteMovieGate movieId={movie.id} movieTitle={movie.title} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-cinema-text mb-5">Markets (Worldwide)</h2>
        <div className="flex flex-row flex-wrap gap-3">
          {marketButtons.map((button) => (
            <Link
              key={`worldwide-${button.title}`}
              href={`/movie/${movie.slug}/worldwide/${button.timeframe}`}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-[22px] rounded-lg text-center transition-colors duration-200 shadow-cinema-card hover:shadow-cinema-card-hover"
            >
              {button.title}
            </Link>
          ))}
        </div>
      </section>

      <MovieComments movieId={movie.id} />
    </div>
  );
}
