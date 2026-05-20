import { cache } from 'react';
import { createPublicSupabase } from '@/utils/supabase/public';

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  teaser_image_url: string | null;
  created_at: string;
};

export type PostDetail = {
  title: string;
  slug: string;
  teaser_image_url: string | null;
  body: string | null;
  created_at: string;
};

export async function getPosts(): Promise<PostListItem[]> {
  const supabase = createPublicSupabase();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, teaser_image_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('posts list:', error);
    return [];
  }

  return posts ?? [];
}

export const getPost = cache(async (slug: string): Promise<PostDetail | null> => {
  const supabase = createPublicSupabase();
  const { data: post, error } = await supabase
    .from('posts')
    .select('title, slug, teaser_image_url, body, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('post detail:', error);
    return null;
  }

  return post;
});
