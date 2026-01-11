import HeroCarousel from "@/components/HeroCarousel"; // your existing hero
import MovieRow from "@/components/MovieRow";
import SearchBar from "@/components/SearchBar";
import Leaderboard from "@/components/Leaderboard";
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

  // Optional: if you add a boolean column `is_trending` in movies
  const { data: trending } = await supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .eq("is_trending", true)       // remove if you don't have this column
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

  // Extract unique movies from the results
  // Handle both potential response structures: { movies: {...} } or { movies: {...} } (nested)
  const archiveMovies = recentArchiveMarkets
    ?.map((m: { movies: { id: string; slug: string; title: string; image_url: string | null; release_date: string | null } }) => m.movies)
    .filter((movie) => movie !== null && movie !== undefined)
    .filter((movie, index, self) => 
      index === self.findIndex((m) => m.id === movie.id)
    ) || [];

  // Fetch hero articles from database
  const { data: heroArticlesData } = await supabase
    .from('hero_articles')
    .select('id, title, image_path, href, kicker')
    .order('display_order', { ascending: true });

  // Transform database articles to HeroItem format
  const heroItems = heroArticlesData?.map((article) => ({
    id: article.id,
    title: article.title,
    imageUrl: article.image_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/hero-images/${article.image_path}`
      : '',
    href: article.href,
    kicker: article.kicker || undefined,
  })) || [];

  return (
    <main className="px-4 py-6 max-w-7xl mx-auto">
      {/* Hero Section with Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <HeroCarousel items={heroItems} />
        <Leaderboard />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upcoming & Trending</h1>
        <SearchBar />
      </div>

      {!!(trending && trending.length) && <MovieRow title="Trending Now" movies={trending} />}
      <MovieRow title="Releasing Soon" movies={upcoming10 || []} />
      {!!(inTheaters && inTheaters.length) && <MovieRow title="In Theaters" movies={inTheaters} />}
      {!!(archiveMovies && archiveMovies.length) && <MovieRow title="Recent Archive" movies={archiveMovies} />}
    </main>
  );
}
