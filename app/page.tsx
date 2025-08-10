import HeroCarousel from "@/components/HeroCarousel"; // your existing hero
import MovieRow from "@/components/MovieRow";
import SearchBar from "@/components/SearchBar";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = createClient();
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

  return (
    <main className="px-4 py-6 max-w-7xl mx-auto">
      <HeroCarousel />

      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upcoming & Trending</h1>
        <SearchBar />
      </div>

      {!!(trending && trending.length) && <MovieRow title="Trending Now" movies={trending} />}
      <MovieRow title="Releasing Soon" movies={upcoming10 || []} />
    </main>
  );
}
