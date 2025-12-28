'use server';

import { createServerSupabase } from '@/utils/supabase/server';
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
