'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createPost(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const slug = (formData.get('slug') as string | null)?.trim() ?? '';
  const teaserRaw = (formData.get('teaser_image_url') as string | null)?.trim() ?? '';
  const body = (formData.get('body') as string | null) ?? '';

  if (!title) {
    return 'Title is required.';
  }
  if (!slug) {
    return 'Slug is required.';
  }
  if (!SLUG_RE.test(slug)) {
    return 'Slug must be lowercase letters, numbers, and single hyphens between words (e.g. my-post-title).';
  }

  const teaser_image_url = teaserRaw.length > 0 ? teaserRaw : null;

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return 'Not authenticated.';
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    return 'User profile not found.';
  }
  if (userProfile.is_admin !== true) {
    return 'Not authorized.';
  }

  const { error: insertError } = await supabase.from('posts').insert({
    title,
    slug,
    teaser_image_url,
    body,
    author_id: user.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return 'That slug is already in use. Choose another.';
    }
    console.error('createPost insert:', insertError);
    return insertError.message || 'Could not create post.';
  }

  revalidatePath('/posts');
  revalidatePath(`/posts/${slug}`);
  redirect(`/posts/${slug}`);
}
