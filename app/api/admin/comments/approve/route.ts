import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Update the comment directly using service role client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('movie_comments')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error approving comment:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in approve comment route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

