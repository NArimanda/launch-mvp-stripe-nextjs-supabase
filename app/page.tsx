import MovieRow from "@/components/MovieRow";
import SearchBar from "@/components/SearchBar";
import InstructionsSection from "@/components/InstructionsSection";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: upcoming10 } = await supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .gte("release_date", today)
    .order("release_date", { ascending: true })
    .limit(10);

  // In theaters: movies released within the last month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 10);

  const { data: inTheaters } = await supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .gte("release_date", oneMonthAgoStr)
    .lt("release_date", today)
    .order("release_date", { ascending: false })
    .limit(10);

  // Recent Archive: movies where the month timeframe market has ended
  const now = new Date().toISOString();
  const { data: recentArchiveMarkets } = await supabase
    .from("markets")
    .select(`
      end_time,
      movies!inner(id, slug, title, image_url, release_date)
    `)
    .eq("timeframe", "month")
    .eq("type", "worldwide")
    .lt("end_time", now)
    .order("end_time", { ascending: false })
    .limit(10);

  // Extract unique movies (Supabase may type `movies` as an array for this join)
  const archiveMovies =
    recentArchiveMarkets
      ?.flatMap((m) => {
        const nested = m.movies;
        if (nested == null) return [];
        return Array.isArray(nested) ? nested : [nested];
      })
      .filter((movie): movie is NonNullable<typeof movie> => movie != null)
      .filter(
        (movie, index, self) => index === self.findIndex((x) => x.id === movie.id),
      ) ?? [];

  return (
    <main className="min-h-screen bg-cinema-page px-4 py-6 max-w-7xl mx-auto">
      {/* Instructions Section */}
      <InstructionsSection />

      {/* Releasing Soon - First row */}
      <MovieRow title="Releasing Soon" movies={upcoming10 || []} />

      {/* In Theaters and Recent Archive Section */}
      {!!(inTheaters && inTheaters.length) && <MovieRow title="In Theaters" movies={inTheaters} />}
      {!!(archiveMovies && archiveMovies.length) && (
        <MovieRow title="Recent Archive" movies={archiveMovies} rightElement={<SearchBar />} />
      )}
    </main>
  );
}
