"use client";
import * as React from "react";
import { supabase } from "@/utils/supabase";
import { getRanges, type MarketType, type RangeBucket } from "@/lib/boxOfficeRanges";

type Bet = {
  points: number;
  selected_range: string;
};

interface MarketHeatmapProps {
  marketId: string;
  timeframe: "weekend" | "month";
}

interface HeatmapRow {
  id: string;
  label: string;
  points: number;
}

/**
 * Parse selected_range string into lower and upper bounds (in dollars)
 * Formats: "400+", "2-20", "[10 - 30]"
 */
function parseRange(selectedRange: string): { lower: number; upper: number | null } {
  // Remove brackets if present: "[10 - 30]" -> "10 - 30"
  const cleaned = selectedRange.replace(/[\[\]]/g, '').trim();
  
  // Check for open-ended: "400+"
  if (cleaned.endsWith('+')) {
    const lowerStr = cleaned.slice(0, -1).trim();
    const lowerM = parseFloat(lowerStr);
    return {
      lower: lowerM * 1_000_000, // Convert millions to dollars
      upper: null
    };
  }
  
  // Parse range: "2-20" or "10 - 30"
  const parts = cleaned.split(/[-–]/).map(s => s.trim());
  if (parts.length === 2) {
    const lowerM = parseFloat(parts[0]);
    const upperM = parseFloat(parts[1]);
    return {
      lower: lowerM * 1_000_000, // Convert millions to dollars
      upper: upperM * 1_000_000
    };
  }
  
  // Fallback: treat as single value
  const valueM = parseFloat(cleaned);
  return {
    lower: valueM * 1_000_000,
    upper: valueM * 1_000_000
  };
}

/**
 * Check if a bin interval overlaps with a bet interval
 * 
 * Bins are half-open: [bin.lower, bin.upper) or [bin.lower, ∞) if upper is null
 * Bet intervals are closed: [betLower, betUpper] or [betLower, ∞) if betUpper is null
 * 
 * Two intervals overlap if they share at least one point.
 * For half-open bin [a, b) and closed bet [c, d]:
 *   - They overlap if: a < d && b > c
 *   - Special cases:
 *     * Bin [a, ∞): overlaps if betUpper is null OR betUpper > a
 *     * Bet [c, ∞): overlaps if binUpper is null OR binUpper > c
 */
function binOverlapsBet(
  binLower: number,
  binUpper: number | null,
  betLower: number,
  betUpper: number | null
): boolean {
  // Both are open-ended - always overlap
  if (binUpper === null && betUpper === null) {
    return true;
  }
  
  // Bin is open-ended [binLower, ∞)
  if (binUpper === null) {
    // Bet overlaps if it extends to or beyond binLower
    return betUpper === null || betUpper > binLower;
  }
  
  // Bet is open-ended [betLower, ∞)
  if (betUpper === null) {
    // Bin overlaps if it extends beyond betLower
    return binUpper > betLower;
  }
  
  // Both have upper bounds
  // Bin: [binLower, binUpper) - half-open
  // Bet: [betLower, betUpper] - closed
  // Overlap if: binLower < betUpper && binUpper > betLower
  return binLower < betUpper && binUpper > betLower;
}

/**
 * Compute heatmap totals by distributing bet points across covered bins
 */
function computeHeatmapTotals(
  bins: RangeBucket[],
  bets: Bet[]
): number[] {
  // Build bin ID to index map
  const binIdToIndex = new Map<string, number>();
  bins.forEach((bin, index) => {
    binIdToIndex.set(bin.id, index);
  });
  
  // Initialize totals array
  const totals = new Array(bins.length).fill(0);
  
  for (const bet of bets) {
    const betPoints = bet.points || 0;
    if (betPoints <= 0) continue;
    if (!bet.selected_range) continue;
    
    // Parse selected_range to get bet bounds
    const { lower: betLower, upper: betUpper } = parseRange(bet.selected_range);
    
    // Find all bins that overlap with this bet range
    const coveredBinIndices: number[] = [];
    bins.forEach((bin, index) => {
      if (binOverlapsBet(bin.lower, bin.upper, betLower, betUpper)) {
        coveredBinIndices.push(index);
      }
    });
    
    // Distribute points evenly across covered bins
    if (coveredBinIndices.length > 0) {
      const share = betPoints / coveredBinIndices.length;
      coveredBinIndices.forEach(binIdx => {
        totals[binIdx] += share;
      });
    }
  }
  
  return totals;
}

/**
 * Format points for display
 * >= 10: round to integer
 * < 10: show 1 decimal
 */
function formatPoints(points: number): string {
  if (points >= 10) {
    return Math.round(points).toString();
  }
  return points.toFixed(1);
}

export default function MarketHeatmap({ marketId, timeframe }: MarketHeatmapProps) {
  const [rows, setRows] = React.useState<HeatmapRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<{
    totalBets: number;
    totalPoints: number;
    maxBinPoints: number;
  } | null>(null);
  
  // Map timeframe to MarketType (same as BetForm.tsx does)
  const marketType: MarketType = React.useMemo(() => {
    return timeframe === "weekend" ? "OPENING_WEEKEND" : "ONE_MONTH";
  }, [timeframe]);
  
  // Get available ranges for this market type (same as BetForm.tsx)
  const bins = React.useMemo(() => {
    return getRanges(marketType);
  }, [marketType]);
  
  // Fetch bets and compute totals
  React.useEffect(() => {
    const fetchAndCompute = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch bets for this market
        const { data: betsData, error: betsError } = await supabase
          .from("bets")
          .select("points, selected_range")
          .eq("market_id", marketId);
        
        if (betsError) {
          throw new Error(`Failed to fetch bets: ${betsError.message}`);
        }
        
        const bets = (betsData || []) as Bet[];
        
        // Compute heatmap totals
        const totals = computeHeatmapTotals(bins, bets);
        
        // Build rows for rendering
        const heatmapRows: HeatmapRow[] = bins.map((bin, index) => ({
          id: bin.id,
          label: bin.label,
          points: totals[index]
        }));
        
        setRows(heatmapRows);
        
        // Compute debug info
        if (process.env.NODE_ENV === 'development') {
          const totalBets = bets.length;
          const totalPoints = bets.reduce((sum, bet) => sum + (bet.points || 0), 0);
          const maxBinPoints = Math.max(...totals, 0);
          setDebugInfo({ totalBets, totalPoints, maxBinPoints });
        }
      } catch (err) {
        console.error("Error computing heatmap:", err);
        setError(err instanceof Error ? err.message : "Failed to load heatmap data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndCompute();
  }, [marketId, bins]);
  
  // Compute max points for bar scaling
  const maxPoints = React.useMemo(() => {
    if (rows.length === 0) return 1;
    return Math.max(1, ...rows.map(r => r.points));
  }, [rows]);
  
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        <div className="text-center py-4 text-slate-600 dark:text-slate-400">
          Loading heatmap...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 p-4 bg-red-50 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400 text-sm">Error: {error}</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="mb-3 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
          <div>Total bets: {debugInfo.totalBets}</div>
          <div>Total points: {formatPoints(debugInfo.totalPoints)}</div>
          <div>Max bin points: {formatPoints(debugInfo.maxBinPoints)}</div>
        </div>
      )}
      
      <div className="space-y-3">
        {rows.map((row) => {
          const widthPct = row.points === 0 
            ? 0 
            : Math.max(2, (row.points / maxPoints) * 100); // Minimum 2% width if nonzero
          
          return (
            <div key={row.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-300">
                {row.label}
              </div>
              <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                {row.points > 0 && (
                  <div
                    className="h-full bg-blue-500/70 dark:bg-blue-400/70 transition-all"
                    style={{ width: `${widthPct}%` }}
                    title={`${formatPoints(row.points)} pts`}
                  />
                )}
              </div>
              <div className="w-28 text-right text-xs text-slate-600 dark:text-slate-300">
                {formatPoints(row.points)} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
