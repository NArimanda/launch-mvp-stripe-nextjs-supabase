'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { revalidatePath } from 'next/cache';

async function checkAdmin(userId: string): Promise<boolean> {
  // Use service role client to check admin status
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

export async function approveComment(commentId: string, userId: string): Promise<{ error?: string }> {
  // Validate user_id is provided
  if (!userId) {
    return { error: 'User ID is required' };
  }

  // Verify user exists and is admin using service role client
  const isAdmin = await checkAdmin(userId);
  if (!isAdmin) {
    return { error: 'Not authorized' };
  }

  // Approve the comment using admin client to bypass RLS
  const { error: updateError } = await supabaseAdmin
    .from('movie_comments')
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: userId,
    })
    .eq('id', commentId);

  if (updateError) {
    console.error('Error approving comment:', updateError);
    return { error: updateError.message };
  }

  revalidatePath('/admin/comments');
  return {};
}

export async function deleteComment(commentId: string, userId: string): Promise<{ error?: string }> {
  // Validate user_id is provided
  if (!userId) {
    return { error: 'User ID is required' };
  }

  // Verify user exists and is admin using service role client
  const isAdmin = await checkAdmin(userId);
  if (!isAdmin) {
    return { error: 'Not authorized' };
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

  revalidatePath('/admin/comments');
  return {};
}
