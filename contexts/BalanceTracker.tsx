'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // gives you { user, supabase }

type Props = {
  className?: string;
  showLabel?: boolean;   // show the word "points"
  compact?: boolean;     // smaller, tighter text
  prefixIcon?: React.ReactNode; // optional icon before the number
  /** When set, show this value instead of fetching wallet balance (e.g. total value from parent). */
  value?: number | null;
  /** When using value, parent can control loading state. */
  loading?: boolean;
};

export default function BalanceTracker({
  className = '',
  showLabel = true,
  compact = true,
  prefixIcon,
  value: valueProp,
  loading: loadingProp,
}: Props) {
  const { user, supabase } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(true);

  const userId = user?.id ?? null;

  // Fetch current balance
  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      if (!userId) {
        setBalance(null);
        setInternalLoading(false);
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
          setInternalLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Balance fetch exception:', e);
          setInternalLoading(false);
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
        ? 'text-[11px] leading-none text-cinema-textMuted'
        : 'text-sm text-cinema-text',
    [compact]
  );

  if (!userId) return null;

  const useOverride = valueProp !== undefined && valueProp !== null;
  const displayValue = useOverride ? valueProp : (balance ?? 0);
  const displayLoading = useOverride ? (loadingProp ?? false) : internalLoading;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {prefixIcon ? <span className="opacity-70">{prefixIcon}</span> : null}
      <span className={textClasses}>
        {displayLoading ? '…' : displayValue.toLocaleString()}
        {showLabel ? ' points' : ''}
      </span>
    </div>
  );
}
