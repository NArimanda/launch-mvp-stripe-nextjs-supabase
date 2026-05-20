import { createPublicSupabase } from '@/utils/supabase/public';

export type MovieDetail = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  release_date: string | null;
  description: string | null;
};

function normalizeSlug(input: string) {
  const s = decodeURIComponent(input)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

export async function getMovieBySlug(slugParam: string): Promise<MovieDetail | null> {
  const supabase = createPublicSupabase();
  const raw = normalizeSlug(slugParam);
  const candidateSlugs = Array.from(new Set([raw, raw.replace(/-/g, ' ')]));

  const { data: rows } = await supabase
    .from('movies')
    .select('id,slug,title,image_url,release_date,description')
    .in('slug', candidateSlugs)
    .limit(1);

  let movie = rows?.[0] ?? null;

  if (!movie) {
    const { data: rows2 } = await supabase
      .from('movies')
      .select('id,slug,title,image_url,release_date,description')
      .ilike('title', raw)
      .limit(1);
    movie = rows2?.[0] ?? null;
  }

  return movie;
}
