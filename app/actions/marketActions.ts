'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyBetSettlement } from '@/lib/email/notifyBetSettlement';

export async function setMarketOutcome(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const marketId = formData.get('marketId') as string;
    const outcomeValue = formData.get('outcome') as string;
    
    if (!marketId) {
      return 'Market ID is required';
    }
    
    if (!outcomeValue || outcomeValue.trim() === '') {
      return 'Outcome is required';
    }
    
    // Parse and validate outcome
    // Remove currency symbols, commas, and whitespace
    const cleaned = outcomeValue.replace(/[$,\s]/g, '');
    const outcome = parseFloat(cleaned);
    
    if (isNaN(outcome)) {
      return 'Please enter a valid dollar amount';
    }
    
    if (outcome < 0) {
      return 'Outcome must be a non-negative number';
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
      return 'Not authorized. Admin access required.';
    }

    const { data: marketBefore, error: marketBeforeError } = await supabase
      .from('markets')
      .select('status')
      .eq('id', marketId)
      .single();

    if (marketBeforeError || !marketBefore) {
      return 'Market not found';
    }

    const shouldNotify = marketBefore.status !== 'resolved';
    
    // Update market outcome
    const { error: updateError } = await supabase
      .from('markets')
      .update({ outcome: outcome })
      .eq('id', marketId);
    
    if (updateError) {
      return `Failed to set market outcome: ${updateError.message}`;
    }

    if (shouldNotify) {
      void notifyBetSettlement(marketId);
    }
    
    // Revalidate market and movie pages
    // Note: Can't revalidate dynamic paths without slug values, but router.refresh() in component handles it
    revalidatePath('/', 'layout');
    
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}
