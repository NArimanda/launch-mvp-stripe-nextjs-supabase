import { createPublicSupabase } from '@/utils/supabase/public';

export type HomeMovie = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  release_date: string | null;
};

export type HomeLatestPost = {
  slug: string;
  title: string;
  teaser_image_url: string | null;
};

export type HomePageData = {
  upcoming10: HomeMovie[];
  inTheaters: HomeMovie[];
  archiveMovies: HomeMovie[];
  latestPost: HomeLatestPost | null;
};

export async function getHomePageData(): Promise<HomePageData> {
  const supabase = createPublicSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: upcoming10 } = await supabase
    .from('movies')
    .select('id,slug,title,image_url,release_date')
    .gte('release_date', today)
    .order('release_date', { ascending: true })
    .limit(10);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().slice(0, 10);

  const { data: inTheaters } = await supabase
    .from('movies')
    .select('id,slug,title,image_url,release_date')
    .gte('release_date', oneMonthAgoStr)
    .lt('release_date', today)
    .order('release_date', { ascending: false })
    .limit(10);

  const now = new Date().toISOString();
  const { data: recentArchiveMarkets } = await supabase
    .from('markets')
    .select(`
      end_time,
      movies!inner(id, slug, title, image_url, release_date)
    `)
    .eq('timeframe', 'month')
    .eq('type', 'worldwide')
    .lt('end_time', now)
    .order('end_time', { ascending: false })
    .limit(10);

  const archiveMovies =
    recentArchiveMarkets
      ?.flatMap((m) => {
        const nested = m.movies;
        if (nested == null) return [];
        return Array.isArray(nested) ? nested : [nested];
      })
      .filter((movie): movie is HomeMovie => movie != null)
      .filter(
        (movie, index, self) => index === self.findIndex((x) => x.id === movie.id),
      ) ?? [];

  const { data: latestPost, error: latestPostError } = await supabase
    .from('posts')
    .select('slug, title, teaser_image_url')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestPostError) {
    console.error('home latest post:', latestPostError);
  }

  return {
    upcoming10: upcoming10 ?? [],
    inTheaters: inTheaters ?? [],
    archiveMovies,
    latestPost: latestPost ?? null,
  };
}
