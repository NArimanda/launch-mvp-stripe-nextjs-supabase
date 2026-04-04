import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { createServerSupabase } from '@/utils/supabase/server';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin-only: delete a movie and restore user wallets.
 * Resolved markets are unresolve_market'd first (JWT user client) so payouts are reversed.
 * Refund + bet deletion runs in DB function admin_refund_bets_for_movie (single transaction)
 * so Total Value (balance + locked stakes) never double-counts. Run supabase/admin_refund_bets_for_movie.sql in Supabase.
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

    const body = await request.json();
    const movieId = body?.movieId as string | undefined;

    if (!movieId || !UUID_RE.test(movieId)) {
      return NextResponse.json({ error: 'Valid movieId (UUID) is required' }, { status: 400 });
    }

    const { data: movieRow, error: movieFetchError } = await supabaseAdmin
      .from('movies')
      .select('id')
      .eq('id', movieId)
      .maybeSingle();

    if (movieFetchError || !movieRow) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const { data: markets, error: marketsError } = await supabaseAdmin
      .from('markets')
      .select('id, status')
      .eq('movie_id', movieId);

    if (marketsError) {
      console.error('admin delete movie: markets fetch', marketsError);
      return NextResponse.json(
        { error: marketsError.message || 'Failed to load markets' },
        { status: 500 },
      );
    }

    const marketList = markets ?? [];

    // Must use user JWT — unresolve_market checks auth.uid() and is_admin.
    for (const m of marketList) {
      if (m.status === 'resolved') {
        const { error: rpcError } = await supabase.rpc('unresolve_market', {
          p_market_id: m.id,
        });
        if (rpcError) {
          console.error('admin delete movie: unresolve_market', rpcError);
          return NextResponse.json(
            { error: rpcError.message || 'Failed to unresolve a resolved market' },
            { status: 500 },
          );
        }
      }
    }

    const { error: refundRpcError } = await supabaseAdmin.rpc(
      'admin_refund_bets_for_movie',
      { p_movie_id: movieId },
    );

    if (refundRpcError) {
      console.error('admin delete movie: admin_refund_bets_for_movie', refundRpcError);
      return NextResponse.json(
        {
          error:
            refundRpcError.message ||
            'Failed to refund bets (ensure supabase/admin_refund_bets_for_movie.sql is applied)',
        },
        { status: 500 },
      );
    }

    const { error: delMarketsError } = await supabaseAdmin
      .from('markets')
      .delete()
      .eq('movie_id', movieId);

    if (delMarketsError) {
      console.error('admin delete movie: delete markets', delMarketsError);
      return NextResponse.json(
        { error: delMarketsError.message || 'Failed to delete markets' },
        { status: 500 },
      );
    }

    const { data: comments, error: commentsFetchError } = await supabaseAdmin
      .from('movie_comments')
      .select('image_path')
      .eq('movie_id', movieId);

    if (commentsFetchError) {
      console.error('admin delete movie: comments fetch', commentsFetchError);
    } else {
      const paths = [
        ...new Set(
          (comments ?? [])
            .map((c) => c.image_path)
            .filter((p): p is string => typeof p === 'string' && p.length > 0),
        ),
      ];
      if (paths.length > 0) {
        try {
          const { error: storageError } = await supabaseAdmin.storage
            .from('comment-images')
            .remove(paths);
          if (storageError) {
            console.error('admin delete movie: storage remove', storageError);
          }
        } catch (e) {
          console.error('admin delete movie: storage remove', e);
        }
      }
    }

    const { error: delCommentsError } = await supabaseAdmin
      .from('movie_comments')
      .delete()
      .eq('movie_id', movieId);

    if (delCommentsError) {
      console.error('admin delete movie: delete comments', delCommentsError);
      return NextResponse.json(
        { error: delCommentsError.message || 'Failed to delete comments' },
        { status: 500 },
      );
    }

    const { error: delMovieError } = await supabaseAdmin
      .from('movies')
      .delete()
      .eq('id', movieId);

    if (delMovieError) {
      console.error('admin delete movie: delete movie', delMovieError);
      return NextResponse.json(
        { error: delMovieError.message || 'Failed to delete movie' },
        { status: 500 },
      );
    }

    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin delete movie:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
