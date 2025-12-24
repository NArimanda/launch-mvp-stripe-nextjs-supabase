import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, movie_id, parent_id, body: commentBody, position_market_type, position_selected_range, position_points } = body;

    // Validate user_id is provided
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists using service role client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Invalid user' },
        { status: 401 }
      );
    }

    if (!movie_id || !commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert comment directly using service role client (bypasses RLS)
    // User is already validated above, so this is secure
    const { data, error } = await supabaseAdmin
      .from('movie_comments')
      .insert({
        user_id: user_id,
        movie_id: movie_id,
        parent_id: parent_id || null,
        body: commentBody.trim(),
        approved: false, // Comments start as unapproved
        position_market_type: position_market_type || null,
        position_selected_range: position_selected_range || null,
        position_points: position_points || null
      })
      .select()
      .single();

    if (error) {
      console.error('Comment submit - Insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { error: error.message || 'Failed to submit comment', details: error.details },
        { status: 500 }
      );
    }

    const commentData = data;

    return NextResponse.json({ data: commentData }, { status: 201 });
  } catch (err) {
    console.error('Error in submit comment route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

