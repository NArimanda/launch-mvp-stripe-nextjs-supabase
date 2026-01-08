'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { isUsernameOffensive } from '@/lib/usernameModeration';

export async function setUsernameAction(
  prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const usernameInput = formData.get('username') as string;
    
    if (!usernameInput) {
      return 'Username is required';
    }
    
    const trimmed = usernameInput.trim();
    
    // Format validation first
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters';
    }
    
    if (trimmed.length > 20) {
      return 'Username must be at most 20 characters';
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    
    // Normalize to lowercase for storage
    const usernameLower = trimmed.toLowerCase();
    
    // Check for profanity
    if (isUsernameOffensive(usernameLower)) {
      // Generic error message to avoid teaching bypasses
      return 'That username isn\'t allowed. Please choose another.';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Update username in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: usernameLower,
        username_set_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      if (updateError.code === '23505' || updateError.message.includes('unique')) {
        return 'This username is already taken';
      }
      return `Failed to set username: ${updateError.message}`;
    }
    
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}

