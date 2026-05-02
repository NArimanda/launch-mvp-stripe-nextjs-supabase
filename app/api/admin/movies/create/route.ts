import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { createServerSupabase } from '@/utils/supabase/server';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Admin-only: insert a new movie row. id and created_at are left to DB defaults
 * (gen_random_uuid() and now()). Mirrors the auth + service-role pattern used in
 * app/api/admin/movies/delete/route.ts.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (userProfile.is_admin !== true) {
      return NextResponse.json(
        { error: 'Not authorized. Admin access required.' },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const raw = (body ?? {}) as Record<string, unknown>;

    const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const release_date = typeof raw.release_date === 'string' ? raw.release_date.trim() : '';
    const image_url = typeof raw.image_url === 'string' ? raw.image_url.trim() : '';
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';

    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: 'Slug is required and must contain only lowercase letters, numbers, and hyphens.' },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    if (!release_date || !DATE_RE.test(release_date)) {
      return NextResponse.json(
        { error: 'Release date is required and must be in YYYY-MM-DD format.' },
        { status: 400 },
      );
    }

    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(image_url);
    } catch {
      return NextResponse.json({ error: 'Image URL is not a valid URL.' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Image URL must use https://' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('movies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingError) {
      console.error('admin create movie: slug uniqueness check', existingError);
      return NextResponse.json(
        { error: existingError.message || 'Failed to check slug uniqueness' },
        { status: 500 },
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `A movie with slug "${slug}" already exists.` },
        { status: 409 },
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('movies')
      .insert({
        slug,
        title,
        release_date,
        image_url,
        description: description || null,
      })
      .select('id, slug')
      .single();

    if (insertError || !inserted) {
      console.error('admin create movie: insert', insertError);
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create movie' },
        { status: 500 },
      );
    }

    revalidatePath('/');
    revalidatePath(`/movie/${inserted.slug}`);

    return NextResponse.json({ id: inserted.id, slug: inserted.slug });
  } catch (error) {
    console.error('admin create movie:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
