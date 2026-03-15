import { MovieCard } from "./MovieCard";

type Movie = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  release_date: string | null;
};

export default function MovieRow({
  title,
  movies = [] as Movie[],
  rightElement,
}: {
  title: string;
  movies: Movie[];
  rightElement?: React.ReactNode;
}) {
  if (!movies.length) return null;
  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-[rgba(239,68,68,0.12)] bg-cinema-sectionPanel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-[0.2px] text-cinema-text">{title}</h2>
          {rightElement}
        </div>
        <div className="scrollbar-cinema flex gap-4 overflow-x-auto pb-2 [&>*]:shrink-0">
          {movies.map((m) => (
            <MovieCard
              key={m.id}
              slug={m.slug}
              title={m.title}
              releaseDate={m.release_date}
              posterUrl={m.image_url}
              className="w-[150px] sm:w-[180px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
