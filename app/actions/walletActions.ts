'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function restoreBalance(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Fetch wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (walletError && walletError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, but other errors are not
      return `Failed to fetch wallet: ${walletError.message}`;
    }
    
    let balance = wallet?.balance ?? 0;
    
    // Fast gate: if balance >= 250, return error
    if (balance >= 250) {
      return 'Not eligible to restore balance.';
    }
    
    // Compute locked points from pending/open bets
    const { data: lockedRows, error: lockedErr } = await supabase
      .from('bets')
      .select('points, markets!inner(status)')
      .eq('user_id', user.id)
      .in('markets.status', ['open', 'locked'])
      .or('outcome.is.null,outcome.eq.pending');
    
    if (lockedErr) {
      return `Failed to fetch locked bets: ${lockedErr.message}`;
    }
    
    // Sum locked points robustly
    const lockedPoints = (lockedRows ?? []).reduce((sum, r) => sum + Number(r.points || 0), 0);
    
    // Calculate net balance
    const netBalance = Number(balance) + lockedPoints;
    
    // If netBalance >= 250, return error
    if (netBalance >= 250) {
      return 'Not eligible to restore balance.';
    }
    
    // Update or insert wallet to set balance to 500
    if (wallet) {
      // Wallet exists, update it
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: 500 })
        .eq('user_id', user.id);
      
      if (updateError) {
        return `Failed to restore balance: ${updateError.message}`;
      }
    } else {
      // Wallet doesn't exist, create it
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 500
        });
      
      if (insertError) {
        return `Failed to restore balance: ${insertError.message}`;
      }
    }
    
    // Revalidate dashboard paths
    // Revalidate at layout level to cover all dashboard routes
    revalidatePath('/', 'layout');
    
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}
