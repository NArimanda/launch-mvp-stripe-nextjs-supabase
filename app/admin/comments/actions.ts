'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function approveComment(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const commentId = formData.get('commentId') as string;
    
    if (!commentId) {
      return 'Comment ID is required';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('SERVER ACTION USER:', user?.id);
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
    }
    
    // Update comment to approved
    const { error: updateError } = await supabase
      .from('movie_comments')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', commentId);
    
    if (updateError) {
      return `Failed to approve comment: ${updateError.message}`;
    }
    
    revalidatePath('/admin/comments');
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}

export async function deleteComment(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const commentId = formData.get('commentId') as string;
    
    if (!commentId) {
      return 'Comment ID is required';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('SERVER ACTION USER:', user?.id);
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
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
    
    // Delete the comment
    const { error: deleteError } = await supabase
      .from('movie_comments')
      .delete()
      .eq('id', commentId);
    
    if (deleteError) {
      return `Failed to delete comment: ${deleteError.message}`;
    }
    
    revalidatePath('/admin/comments');
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}

export async function toggleBanUser(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const userId = formData.get('userId') as string;
    
    if (!userId) {
      return 'User ID is required';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
    }
    
    // Get current ban status
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', userId)
      .single();
    
    if (targetError || !targetUser) {
      return 'Target user not found';
    }
    
    // Toggle ban status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_banned: !targetUser.is_banned,
      })
      .eq('id', userId);
    
    if (updateError) {
      return `Failed to toggle ban status: ${updateError.message}`;
    }
    
    revalidatePath('/admin/comments');
    return 'OK'; // Return success token instead of null
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}
