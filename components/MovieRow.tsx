import { MovieCard } from "./MovieCard";

type Movie = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  release_date: string | null;
};

export default function MovieRow({ title, movies = [] as Movie[] }: { title: string; movies: Movie[] }) {
  if (!movies.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [&>*]:shrink-0">
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
    </section>
  );
}
