'use client';

import dynamic from "next/dynamic";
import { type MarketType, type Timeframe } from "@/lib/binPresets";

// Lazy import the MarketContent component
const MarketContent = dynamic(() => import("@/components/MarketContent"), { ssr: false });

interface MarketContentWrapperProps {
  marketId: string;
  bins: any[];
  stats: any[];
  type: MarketType;
  timeframe: Timeframe;
}

export default function MarketContentWrapper({ marketId, bins, stats, type, timeframe }: MarketContentWrapperProps) {
  return <MarketContent marketId={marketId} bins={bins} stats={stats} type={type} timeframe={timeframe} />;
} 