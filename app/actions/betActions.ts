'use server';

import { createServerSupabase } from '@/utils/supabase/server';

export async function placeBetAction(
  market_id: string,
  selected_range: string,
  points: number,
  potential_payout: number,
  price_multiplier: number,
  bin_id: string | null = null
): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createServerSupabase();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { error: 'Not authenticated' };
    }

    // Check cooldown: get the most recent bet time for this user
    const { data: lastBet, error: cooldownError } = await supabase
      .from('bets')
      .select('placed_at')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cooldownError) {
      console.error('Error checking bet cooldown:', cooldownError);
      return { error: 'Failed to check cooldown' };
    }

    // If user has a previous bet, check if cooldown period has passed
    if (lastBet?.placed_at) {
      const lastBetTime = new Date(lastBet.placed_at).getTime();
      const now = Date.now();
      const diffSeconds = (now - lastBetTime) / 1000;
      const cooldownSeconds = 120; // 2 minutes

      if (diffSeconds < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - diffSeconds);
        return { error: `Please wait ${remaining}s before placing another bet.` };
      }
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
      return { error: 'Wallet not found' };
    }

    if (!wallet || wallet.balance < points) {
      return { error: 'Insufficient points' };
    }

    // Deduct points from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - points })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Error deducting points from wallet:', deductError);
      return { error: 'Failed to deduct points from wallet' };
    }

    // Insert the bet with placed_at explicitly set
    const { error: insertError } = await supabase
      .from('bets')
      .insert({
        user_id: user.id,
        market_id,
        selected_range,
        points,
        potential_payout,
        price_multiplier,
        bin_id,
        status: 'pending',
        outcome: 'pending',
        placed_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting bet:', insertError);
      // Attempt to refund points if bet insertion fails
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance })
        .eq('user_id', user.id);
      return { error: insertError.message || 'Failed to place bet' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in placeBetAction:', error);
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
  }
}

