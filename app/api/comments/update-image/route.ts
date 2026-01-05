import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comment_id, image_path, image_mime, image_size } = body;

    if (!comment_id || !image_path) {
      return NextResponse.json(
        { error: 'Comment ID and image path are required' },
        { status: 400 }
      );
    }

    // Update comment with image metadata using admin client
    const { error: updateError } = await supabaseAdmin
      .from('movie_comments')
      .update({
        image_path: image_path,
        image_mime: image_mime || null,
        image_size: image_size || null
      })
      .eq('id', comment_id);

    if (updateError) {
      console.error('Error updating comment with image metadata:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update image metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error in update image route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

