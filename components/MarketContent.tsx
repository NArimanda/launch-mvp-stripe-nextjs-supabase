'use client';

import dynamic from "next/dynamic";
import { type MarketType, type Timeframe } from "@/lib/binPresets";

type BinRow = {
  market_id: string;
  bin_id: string;
  position: number;
  lower_cents: number;
  upper_cents: number | null;
  is_open_ended: boolean;
  label: string;
};

type BetStat = {
  selected_bin_id: string | null;
  total_bets: number;
  total_points: number;
  yes_bets: number;
  no_bets: number;
};

// Lazy import client components
const MarketHeatmap = dynamic(() => import("@/components/MarketHeatmap"), { ssr: false });
const BetForm = dynamic(() => import("@/components/BetForm"), { ssr: false });

interface MarketContentProps {
  marketId: string;
  bins: BinRow[];
  stats: BetStat[];
  type: MarketType;
  timeframe: Timeframe;
  marketStatus: string;
}

export default function MarketContent({ marketId, bins, stats, type, timeframe, marketStatus }: MarketContentProps) {
  const isMarketClosed = marketStatus === 'closed';
  const isMarketResolved = marketStatus === 'resolved';

  return (
    <>
      {/* Heatmap / distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Current Sentiment</h2>
        <MarketHeatmap
          marketId={marketId}
          timeframe={timeframe}
        />
      </div>

      {/* Bet form */}
      <div className="mb-10 relative">
        <h2 className="text-xl font-semibold mb-3">
          Place a Bet
          {isMarketClosed && <span className="text-orange-600 dark:text-orange-400 ml-2">(Market Closed)</span>}
          {isMarketResolved && <span className="text-red-600 dark:text-red-400 ml-2">(Market Resolved)</span>}
        </h2>
        
        <div className="relative">
          <BetForm marketId={marketId} bins={bins} type={type} timeframe={timeframe} />
          
          {/* Blurred overlay for closed markets */}
          {isMarketClosed && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="text-center p-6">
                <div className="text-2xl mb-2">🔒</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Market Not Currently Taking Bets
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  This market is temporarily closed. Check back later to place your bets.
                </p>
              </div>
            </div>
          )}
          
          {/* Overlay for resolved markets */}
          {isMarketResolved && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="text-center p-6">
                <div className="text-2xl mb-2">🏁</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Market Resolved
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  This market has been resolved. No more bets can be placed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 