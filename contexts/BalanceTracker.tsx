'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // gives you { user, supabase }

type Props = {
  className?: string;
  showLabel?: boolean;   // show the word "points"
  compact?: boolean;     // smaller, tighter text
  prefixIcon?: React.ReactNode; // optional icon before the number
};

export default function BalanceTracker({
  className = '',
  showLabel = true,
  compact = true,
  prefixIcon,
}: Props) {
  const { user, supabase } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userId = user?.id ?? null;

  // Fetch current balance
  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      if (!userId) {
        setBalance(null);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (!cancelled) {
          if (error) console.error('Balance fetch error:', error);
          setBalance(data?.balance ?? 0);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Balance fetch exception:', e);
          setLoading(false);
        }
      }
    }
    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // Live updates via Realtime on wallets table
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet_balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newBal = (payload.new as { balance?: number })?.balance;
          if (typeof newBal === 'number') setBalance(newBal);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const textClasses = useMemo(
    () =>
      compact
        ? 'text-[11px] leading-none text-gray-600 dark:text-gray-300'
        : 'text-sm text-gray-700 dark:text-gray-200',
    [compact]
  );

  if (!userId) return null;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {prefixIcon ? <span className="opacity-70">{prefixIcon}</span> : null}
      <span className={textClasses}>
        {loading ? '…' : (balance ?? 0).toLocaleString()}
        {showLabel ? ' points' : ''}
      </span>
    </div>
  );
}
