import MovieRow from "@/components/MovieRow";
import LatestPostPreview from "@/components/LatestPostPreview";
import SearchBar from "@/components/SearchBar";
import InstructionsSection from "@/components/InstructionsSection";
import { getHomePageData } from "@/lib/data/home";

export const revalidate = 120;

export default async function Home() {
  const { upcoming10, inTheaters, archiveMovies, latestPost } = await getHomePageData();

  return (
    <main className="min-h-screen bg-cinema-page px-4 py-6 max-w-7xl mx-auto">
      <InstructionsSection />

      <MovieRow title="Releasing Soon" movies={upcoming10} />

      {latestPost?.slug ? (
        <LatestPostPreview
          slug={latestPost.slug}
          title={latestPost.title}
          teaser_image_url={latestPost.teaser_image_url}
        />
      ) : null}

      {!!inTheaters.length && <MovieRow title="In Theaters" movies={inTheaters} />}
      {!!archiveMovies.length && (
        <MovieRow title="Recent Archive" movies={archiveMovies} rightElement={<SearchBar />} />
      )}
    </main>
  );
}
