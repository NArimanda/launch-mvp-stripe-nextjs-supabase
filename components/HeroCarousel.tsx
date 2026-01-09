'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { HERO_ITEMS, HeroItem } from "../data/HeroArticles";

const AUTOPLAY_MS = 5000;

export default function HeroCarousel({ items = HERO_ITEMS }: { items?: HeroItem[] }) {
  const { user, supabase } = useAuth();
  const [i, setI] = useState(0);
  const [netBalance, setNetBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const go = useCallback((next: number) => {
    setI(() => (next + items.length) % items.length);
  }, [items.length]);

  const next = useCallback(() => go(i + 1), [go, i]);
  const prev = useCallback(() => go(i - 1), [go, i]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => { 
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [next]);


  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    timerRef.current = setInterval(next, AUTOPLAY_MS);
  }, [next]);

  const handleArticleClick = useCallback((item: HeroItem) => {
    // Handle article click if needed
  }, []);

  // Calculate net balance (wallet balance + locked bet points)
  useEffect(() => {
    let cancelled = false;
    
    async function calculateNetBalance() {
      if (!user?.id) {
        setNetBalance(null);
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);
        
        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
          if (!cancelled) {
            setNetBalance(null);
            setIsLoadingBalance(false);
          }
          return;
        }

        const balance = wallet?.balance ?? 0;

        // Fetch locked bets (bets with outcome NULL or 'pending' in markets with status 'open' or 'locked')
        const { data: lockedRows, error: lockedErr } = await supabase
          .from('bets')
          .select('points, markets!inner(status)')
          .eq('user_id', user.id)
          .in('markets.status', ['open', 'locked'])
          .or('outcome.is.null,outcome.eq.pending');

        if (lockedErr) {
          console.error('Error fetching locked bets:', lockedErr);
          if (!cancelled) {
            setNetBalance(null);
            setIsLoadingBalance(false);
          }
          return;
        }

        // Sum locked points
        const lockedPoints = (lockedRows ?? []).reduce((sum, r) => sum + Number(r.points || 0), 0);

        // Calculate net balance
        const calculatedNetBalance = Number(balance) + lockedPoints;

        if (!cancelled) {
          setNetBalance(calculatedNetBalance);
          setIsLoadingBalance(false);
        }
      } catch (error) {
        console.error('Error calculating net balance:', error);
        if (!cancelled) {
          setNetBalance(null);
          setIsLoadingBalance(false);
        }
      }
    }

    calculateNetBalance();
    
    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  if (!items.length) {
    return (
      <div className="relative h-[38vh] sm:h-[52vh] rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No articles to display</p>
      </div>
    );
  }

  return (
    <section aria-label="Featured articles" className="relative w-full overflow-hidden">
      {/* Restore Balance Button - Only show when net balance < 500 */}
      {user && !isLoadingBalance && netBalance !== null && netBalance < 500 && (
        <Link
          href="/dashboard"
          className="absolute top-4 right-4 z-30 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg"
        >
          restore balance to 500
        </Link>
      )}
      <div className="relative h-[38vh] sm:h-[52vh] rounded-2xl">
        {items.map((item, idx) => (
          <Link
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`absolute inset-0 transition-opacity duration-500 ${
              idx === i 
                ? "opacity-100 z-10 pointer-events-auto" 
                : "opacity-0 z-0 pointer-events-none"
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleArticleClick(item)}
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover rounded-2xl"
            />
            {/* gradient + text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 text-white">
              {item.kicker && <span className="text-xs uppercase tracking-wide opacity-80">{item.kicker}</span>}
              <h2 className="mt-1 text-xl sm:text-3xl font-semibold">{item.title}</h2>
            </div>
          </Link>
        ))}
      </div>

      {/* controls */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors z-20"
      >‹</button>
      <button
        aria-label="Next"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors z-20"
      >›</button>

      {/* dots */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20">
        {items.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => go(idx)}
            className={`h-2 w-2 rounded-full transition-colors ${idx === i ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
