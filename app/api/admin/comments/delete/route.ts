import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { createServerSupabase } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    if (userProfile.is_admin !== true) {
      return NextResponse.json(
        { error: 'Not authorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Fetch comment to check for image_path before deletion
    const { data: comment, error: fetchError } = await supabaseAdmin
      .from('movie_comments')
      .select('image_path')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching comment before deletion:', fetchError);
      // Continue with deletion even if fetch fails
    }

    // If comment has an image, delete it from storage (best effort)
    if (comment?.image_path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('comment-images')
          .remove([comment.image_path]);

        if (storageError) {
          console.error('Error deleting comment image from storage:', storageError);
          // Don't fail comment deletion if storage delete fails
        }
      } catch (storageErr) {
        console.error('Error deleting comment image from storage:', storageErr);
        // Don't fail comment deletion if storage delete fails
      }
    }

    // Delete the comment directly using service role client (bypasses RLS)
    const { error } = await supabaseAdmin
      .from('movie_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete comment route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

