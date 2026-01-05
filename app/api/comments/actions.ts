'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { revalidatePath } from 'next/cache';

async function checkAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

export async function approveCommentAction(commentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // Check admin status
  const isAdmin = await checkAdmin(user.id);
  if (!isAdmin) {
    return { error: 'Not authorized' };
  }

  // Approve the comment using admin client to bypass RLS
  const { error: updateError } = await supabaseAdmin
    .from('movie_comments')
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', commentId);

  if (updateError) {
    console.error('Error approving comment:', updateError);
    return { error: updateError.message };
  }

  // Revalidate any pages that might show this comment
  // Revalidate admin page and movie pages
  revalidatePath('/admin/comments');
  // Note: We can't revalidate dynamic movie paths without the movieId, but the client will refresh
  return {};
}

export async function deleteCommentAction(commentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // Check admin status
  const isAdmin = await checkAdmin(user.id);
  if (!isAdmin) {
    return { error: 'Not authorized' };
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

  // Delete the comment using admin client to bypass RLS
  const { error: deleteError } = await supabaseAdmin
    .from('movie_comments')
    .delete()
    .eq('id', commentId);

  if (deleteError) {
    console.error('Error deleting comment:', deleteError);
    return { error: deleteError.message };
  }

  // Revalidate admin page and movie pages
  revalidatePath('/admin/comments');
  // Note: We can't revalidate dynamic movie paths without the movieId, but the client will refresh
  return {};
}

export async function toggleBanUserAction(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // Check admin status
  const isAdmin = await checkAdmin(user.id);
  if (!isAdmin) {
    return { error: 'Not authorized' };
  }

  // Get current ban status using admin client
  const { data: targetUser, error: targetError } = await supabaseAdmin
    .from('users')
    .select('is_banned')
    .eq('id', userId)
    .single();

  if (targetError || !targetUser) {
    return { error: 'Target user not found' };
  }

  // Toggle ban status using admin client
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      is_banned: !targetUser.is_banned,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error toggling ban status:', updateError);
    return { error: updateError.message };
  }

  // Revalidate admin page
  revalidatePath('/admin/comments');
  return {};
}

