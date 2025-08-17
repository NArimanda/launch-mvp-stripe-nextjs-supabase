'use client';

import dynamic from "next/dynamic";

// Lazy import the MarketContent component
const MarketContent = dynamic(() => import("@/components/MarketContent"), { ssr: false });

interface MarketContentWrapperProps {
  marketId: string;
  bins: any[];
  stats: any[];
}

export default function MarketContentWrapper({ marketId, bins, stats }: MarketContentWrapperProps) {
  return <MarketContent marketId={marketId} bins={bins} stats={stats} />;
} 