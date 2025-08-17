'use client';

import dynamic from "next/dynamic";

type BinRow = {
  market_id: string;
  bin_id: string;
  position: number;
  lower_cents: string | number;
  upper_cents: string | number | null;
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
}

export default function MarketContent({ marketId, bins, stats }: MarketContentProps) {
  return (
    <>
      {/* Heatmap / distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Current Sentiment</h2>
        <MarketHeatmap
          bins={bins}
          stats={stats}
        />
      </div>

      {/* Bet form */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Place a Bet</h2>
        <BetForm marketId={marketId} bins={bins} />
      </div>
    </>
  );
} 