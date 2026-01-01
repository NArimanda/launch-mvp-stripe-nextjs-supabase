"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getRanges, type MarketType, type RangeBucket } from "@/lib/boxOfficeRanges";
import { computeMultiplier, MAX_MULT } from "@/lib/multiplier";

type Bin = {
  bin_id: string;
  position: number;
  label: string;
  lower_cents: number;
  upper_cents: number | null;
};

interface BetFormProps {
  marketId: string;
  bins: Bin[];
  type: string;
  timeframe: string;
}

export default function BetForm({ marketId, bins, timeframe }: BetFormProps) {
  const { user, session } = useAuth();
  
  // Map timeframe to MarketType
  const marketType: MarketType = React.useMemo(() => {
    return timeframe === "weekend" ? "OPENING_WEEKEND" : "ONE_MONTH";
  }, [timeframe]);
  
  // Get available ranges for this market type
  const availableRanges = React.useMemo(() => {
    return getRanges(marketType);
  }, [marketType]);
  
  // Get the bin edges for the slider (in dollars)
  const binEdges = React.useMemo(() => {
    const edges = availableRanges.map(bucket => bucket.lower);
    const lastBucket = availableRanges[availableRanges.length - 1];
    // For open-ended buckets, we still need an edge for the slider, but we'll track it separately
    if (lastBucket?.upper !== null && lastBucket?.upper !== undefined) {
      edges.push(lastBucket.upper);
    } else {
      // For open-ended, add the lower value again so slider can select it
      edges.push(lastBucket.lower);
    }
    return edges;
  }, [availableRanges]);
  
  // Track which bucket is open-ended
  const openEndedBuckets = React.useMemo(() => {
    const set = new Set<string>();
    availableRanges.forEach(bucket => {
      if (bucket.upper === null || bucket.label.includes('+')) {
        set.add(`${bucket.lower}-null`);
      }
    });
    return set;
  }, [availableRanges]);
  
  // Map to find bucket from dollar values
  const bucketMap = React.useMemo(() => {
    const map = new Map<string, RangeBucket>();
    availableRanges.forEach(bucket => {
      const key = `${bucket.lower}-${bucket.upper ?? 'null'}`;
      map.set(key, bucket);
    });
    return map;
  }, [availableRanges]);
  
  const [selectedRange, setSelectedRange] = React.useState<{ lower: number; upper: number | null } | null>(null);
  const [points, setPoints] = React.useState<number>(50);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Convert dollars to millions for display
  const dollarsToMillions = (dollars: number) => dollars / 1_000_000;
  const formatCurrency = (millions: number) => {
    if (millions >= 1000) {
      return `$${(millions / 1000).toFixed(millions % 1000 === 0 ? 0 : 1)}B`;
    }
    return `$${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M`;
  };

  /**
   * Compute number of bins (k) covered by the selected range
   * A bin is covered if it overlaps with [selectedRange.lower, selectedRange.upper]
   * For open-ended ranges, upper is null and we check if bin.lower >= selectedRange.lower
   */
  const computeSelectedBins = React.useMemo(() => {
    if (!selectedRange) return 0;
    
    const { lower: betLower, upper: betUpper } = selectedRange;
    let coveredCount = 0;
    
    for (const bin of availableRanges) {
      const binLower = bin.lower;
      const binUpper = bin.upper;
      
      // Check if bin overlaps with selected range
      if (betUpper === null) {
        // Open-ended bet: covers all bins starting from betLower (inclusive)
        if (binLower >= betLower) {
          coveredCount++;
        }
      } else if (binUpper === null) {
        // Open-ended bin: covers if bet range extends to or beyond bin.lower
        if (betUpper > binLower) {
          coveredCount++;
        }
      } else {
        // Both have bounds: overlap if bin.lower < betUpper && binUpper > betLower
        // Note: bins are half-open [binLower, binUpper), bets are closed [betLower, betUpper]
        if (binLower < betUpper && binUpper > betLower) {
          coveredCount++;
        }
      }
    }
    
    return coveredCount;
  }, [selectedRange, availableRanges]);

  // Compute multiplier based on bin width
  const multiplier = React.useMemo(() => {
    if (!selectedRange) return MAX_MULT;
    return computeMultiplier({
      totalBins: availableRanges.length,
      selectedBins: computeSelectedBins,
    });
  }, [selectedRange, availableRanges.length, computeSelectedBins]);

  // Compute potential payout
  const potentialPayout = React.useMemo(() => {
    if (!selectedRange || points < 1) return 0;
    return Math.round(points * multiplier);
  }, [points, multiplier, selectedRange]);

  const submit = async () => {
    setError(null);
    setOk(null);

    if (!user) {
      setError("Please sign in to place a bet");
      return;
    }

    if (!selectedRange) {
      setError("Please select a range");
      return;
    }

    if (points < 1) {
      setError("Please enter a valid number of points");
      return;
    }

    setSubmitting(true);

    try {
      // Check if this is an open-ended bucket
      const isOpenEnded = selectedRange.upper === null || 
                          selectedRange.upper === selectedRange.lower ||
                          openEndedBuckets.has(`${selectedRange.lower}-null`);
      
      // Find the matching bucket
      let matchingBucket: RangeBucket | undefined;
      if (isOpenEnded) {
        // For open-ended, find bucket with matching lower and null upper
        matchingBucket = availableRanges.find(b => 
          b.lower === selectedRange.lower && b.upper === null
        );
      } else {
        const key = `${selectedRange.lower}-${selectedRange.upper}`;
        matchingBucket = bucketMap.get(key);
      }
      
      // Format the range as string for API (in millions)
      const lowerM = dollarsToMillions(selectedRange.lower);
      
      // Serialize: open-ended uses "N+", closed uses "N-M"
      let formattedRange: string;
      if (isOpenEnded || (matchingBucket && matchingBucket.upper === null)) {
        formattedRange = `${lowerM}+`;
      } else {
        const upperM = selectedRange.upper ? dollarsToMillions(selectedRange.upper) : lowerM;
        formattedRange = `${lowerM}-${upperM}`;
      }
      
      // Runtime guard: if label includes '+' but selected_range doesn't, fix it
      if (matchingBucket?.label.includes('+') && !formattedRange.includes('+')) {
        console.error('Mismatch: bucket label includes "+" but selected_range does not. Fixing...', {
          label: matchingBucket.label,
          selected_range: formattedRange
        });
        formattedRange = `${lowerM}+`;
      }
      
      // Prepare headers with session token as fallback
      const headers: Record<string, string> = { 
        "Content-Type": "application/json" 
      };
      
      // Add authorization header with session token if available
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/bets/place", {
        method: "POST",
        headers,
        body: JSON.stringify({
          market_id: marketId,
          selected_range: formattedRange,
          selected_bucket_id: matchingBucket?.id,
          selected_bucket_label: matchingBucket?.label,
          points,
          price_multiplier: multiplier,
          bins, // Include bins data for backward compatibility
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("API error response:", errorData);
        
        // Display detailed error information
        const errorMessage = errorData.error || "Failed to place bet";
        const errorDetails = errorData.details ? ` (${errorData.details})` : "";
        const fullErrorMessage = errorMessage + errorDetails;
        
        throw new Error(fullErrorMessage);
      }

      const result = await res.json();

      setOk("Bet placed successfully!");
      setSelectedRange(null);
      setPoints(50);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
      {/* Debug info - remove this later */}
      <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900 text-xs">
        Debug: User ID: {user?.id || 'Not authenticated'} | 
        User object: {user ? 'Present' : 'Missing'}
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Select a range:</div>
        <RangeSlider 
          edges={binEdges}
          availableRanges={availableRanges}
          onRangeChange={(lowerIndex, upperIndex) => {
            const lowerDollars = binEdges[lowerIndex];
            // Check if upperIndex is at the last position and if the last bucket is open-ended
            const lastBucket = availableRanges[availableRanges.length - 1];
            const isLastPosition = upperIndex === binEdges.length - 1;
            const isOpenEnded = isLastPosition && lastBucket?.upper === null;
            
            const upperDollars = isOpenEnded ? null : binEdges[upperIndex];
            setSelectedRange({ lower: lowerDollars, upper: upperDollars });
          }}
          formatValue={formatCurrency}
          dollarsToMillions={dollarsToMillions}
        />
        {selectedRange && (() => {
          const isOpenEnded = selectedRange.upper === null || 
                              selectedRange.upper === selectedRange.lower ||
                              openEndedBuckets.has(`${selectedRange.lower}-null`);
          const matchingBucket = isOpenEnded
            ? availableRanges.find(b => b.lower === selectedRange.lower && b.upper === null)
            : bucketMap.get(`${selectedRange.lower}-${selectedRange.upper}`);
          
          const displayLabel = matchingBucket?.label || 
            (isOpenEnded 
              ? `${formatCurrency(dollarsToMillions(selectedRange.lower))}+`
              : `${formatCurrency(dollarsToMillions(selectedRange.lower))} - ${formatCurrency(dollarsToMillions(selectedRange.upper!))}`);
          
          return (
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              Range selected: <span className="font-medium">{displayLabel}</span>
            </div>
          );
        })()}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">Points:</label>
        <input
          type="number"
          min={1}
          step={1}
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value || "0", 10))}
          className="w-28 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
        />
      </div>

      {selectedRange && (
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Bet Details:
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">Bins covered:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {computeSelectedBins} / {availableRanges.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">Multiplier:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {multiplier.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600">
              <span className="text-slate-700 dark:text-slate-200 font-medium">Potential payout:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {potentialPayout} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {ok && <div className="mb-3 text-sm text-green-600">{ok}</div>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="px-5 py-2 rounded-md bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Placing…" : "Submit Bet"}
      </button>
    </div>
  );
}

interface RangeSliderProps {
  edges: number[];
  availableRanges: RangeBucket[];
  onRangeChange: (lowerIndex: number, upperIndex: number) => void;
  formatValue: (value: number) => string;
  dollarsToMillions: (dollars: number) => number;
}

function RangeSlider({ edges, availableRanges, onRangeChange, formatValue, dollarsToMillions }: RangeSliderProps) {
  const [lowerIndex, setLowerIndex] = React.useState(0);
  const [upperIndex, setUpperIndex] = React.useState(edges.length - 1);
  const [isDragging, setIsDragging] = React.useState<"lower" | "upper" | null>(null);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (thumb: "lower" | "upper") => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(percentage * (edges.length - 1));

    if (isDragging === "lower") {
      const newLowerIndex = Math.max(0, Math.min(index, upperIndex));
      setLowerIndex(newLowerIndex);
      onRangeChange(newLowerIndex, upperIndex);
    } else {
      const newUpperIndex = Math.max(lowerIndex, Math.min(index, edges.length - 1));
      setUpperIndex(newUpperIndex);
      onRangeChange(lowerIndex, newUpperIndex);
    }
  }, [isDragging, edges.length, lowerIndex, upperIndex, onRangeChange]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(null);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const lowerPercentage = (lowerIndex / (edges.length - 1)) * 100;
  const upperPercentage = (upperIndex / (edges.length - 1)) * 100;

  // Format the range display
  const formatRangeDisplay = () => {
    const lowerValue = formatValue(dollarsToMillions(edges[lowerIndex]));
    const upperValue = upperIndex === edges.length - 1 
      ? formatValue(dollarsToMillions(edges[upperIndex])) + "+"
      : formatValue(dollarsToMillions(edges[upperIndex]));
    
    return `${lowerValue} - ${upperValue}`;
  };

  return (
    <div className="relative">
      {/* Track */}
      <div 
        ref={sliderRef}
        className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full relative cursor-pointer"
      >
        {/* Selected range */}
        <div 
          className="absolute h-full bg-blue-500 rounded-full"
          style={{
            left: `${lowerPercentage}%`,
            width: `${upperPercentage - lowerPercentage}%`
          }}
        />
        
        {/* Lower thumb */}
        <div
          className="absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer transform -translate-y-1/2 -translate-x-1/2 hover:scale-110 transition-transform z-10"
          style={{ left: `${lowerPercentage}%` }}
          onMouseDown={handleMouseDown("lower")}
        />
        
        {/* Upper thumb */}
        <div
          className="absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer transform -translate-y-1/2 -translate-x-1/2 hover:scale-110 transition-transform z-10"
          style={{ left: `${upperPercentage}%` }}
          onMouseDown={handleMouseDown("upper")}
        />
      </div>

      {/* Responsive Range Display */}
      <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="text-center">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Selected Range</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {formatRangeDisplay()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Drag the handles to adjust your range
          </div>
        </div>
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-3">
        {edges.map((edge, index) => (
          <div
            key={index}
            className="w-px h-2 bg-slate-300 dark:bg-slate-500"
            title={formatValue(dollarsToMillions(edge))}
          />
        ))}
      </div>
    </div>
  );
}

