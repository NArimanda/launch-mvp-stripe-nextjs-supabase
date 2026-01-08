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

export async function createCommentWithCooldown(
  user_id: string,
  movie_id: string,
  body: string,
  parent_id: string | null = null,
  position_market_type: string | null = null,
  position_selected_range: string | null = null,
  position_points: number | null = null
): Promise<{ success: true; commentId: string } | { error: string }> {
  // Defense-in-depth: Verify authentication even though route handler checks it
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }
  
  // CRITICAL: Verify that the user_id parameter matches the authenticated user
  // This prevents user_id spoofing if this function is ever called from another location
  if (user.id !== user_id) {
    console.error('createCommentWithCooldown: User ID mismatch', {
      authenticatedUserId: user.id,
      providedUserId: user_id
    });
    return { error: 'User ID mismatch' };
  }

  // Check cooldown: get the most recent comment time for this user
  const { data: lastComment, error: cooldownError } = await supabaseAdmin
    .from('movie_comments')
    .select('created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cooldownError) {
    console.error('Error checking comment cooldown:', cooldownError);
    return { error: 'Failed to check comment cooldown' };
  }

  // If user has a previous comment, check if cooldown period has passed
  if (lastComment?.created_at) {
    const lastCommentTime = new Date(lastComment.created_at);
    const now = new Date();
    const timeSinceLastComment = now.getTime() - lastCommentTime.getTime();
    const cooldownMs = 60 * 1000; // 60 seconds in milliseconds

    if (timeSinceLastComment < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastComment) / 1000);
      return { error: `Please wait ${remainingSeconds} seconds before commenting again` };
    }
  }

  // Insert the comment
  const { data: insertedComment, error: insertError } = await supabaseAdmin
    .from('movie_comments')
    .insert({
      user_id: user_id,
      movie_id,
      parent_id,
      body: body.trim(),
      approved: false, // Comments start as unapproved
      position_market_type,
      position_selected_range,
      position_points,
      image_path: null // Will be updated after image upload if present
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error inserting comment:', insertError);
    return { error: insertError.message || 'Failed to submit comment' };
  }

  if (!insertedComment?.id) {
    return { error: 'Failed to create comment: no ID returned' };
  }

  return { success: true, commentId: insertedComment.id };
}

