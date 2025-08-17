"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";

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

export default function BetForm({ marketId, bins }: BetFormProps) {
  const { user } = useAuth();
  const [side, setSide] = React.useState<"YES" | "NO">("YES");
  const [selectedBinId, setSelectedBinId] = React.useState<string | null>(bins[0]?.bin_id ?? null);
  const [selectedRange, setSelectedRange] = React.useState<{ lower: number; upper: number } | null>(null);
  const [points, setPoints] = React.useState<number>(50);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Get the bin edges for the slider
  const binEdges = React.useMemo(() => {
    const edges = bins.map(bin => bin.lower_cents);
    const lastBin = bins[bins.length - 1];
    if (lastBin?.upper_cents !== null && lastBin?.upper_cents !== undefined) {
      edges.push(lastBin.upper_cents);
    }
    return edges;
  }, [bins]);

  // Convert cents to millions for display
  const centsToMillions = (cents: number) => cents / 100 / 1_000_000;
  const formatCurrency = (millions: number) => {
    if (millions >= 1000) {
      return `$${(millions / 1000).toFixed(millions % 1000 === 0 ? 0 : 1)}B`;
    }
    return `$${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M`;
  };

  // Placeholder: multiplier based on simple crowding (fewer points => higher payout)
  // Replace with your pricing function later
  const crowdFactor = 1.0; // TODO: pull real bin totals if you want live quotes here
  const baseOdds = side === "YES" ? 1.8 : 1.8;
  const potentialPayout = Math.max(1, Math.round(points * baseOdds * crowdFactor));

  const submit = async () => {
    setError(null);
    setOk(null);
    if (!user?.id) {
      setError("Please sign in to place a bet.");
      return;
    }
    if (!selectedRange) {
      setError("Select a range.");
      return;
    }
    if (points <= 0) {
      setError("Enter a positive point amount.");
      return;
    }

    setSubmitting(true);
    try {
      // Stub API; implement atomic wallet debit + bet insert on server
      const res = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: marketId,
          selected_bin_id: selectedBinId,
          side: side === "YES",
          points,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to place bet");
      }
      setOk("Bet placed!");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">Side:</div>
        <div className="inline-flex rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
          <button
            className={`px-4 py-1 text-sm ${side === "YES" ? "bg-green-600 text-white" : "bg-transparent text-slate-800 dark:text-slate-200"}`}
            onClick={() => setSide("YES")}
            type="button"
          >
            YES
          </button>
          <button
            className={`px-4 py-1 text-sm ${side === "NO" ? "bg-red-600 text-white" : "bg-transparent text-slate-800 dark:text-slate-200"}`}
            onClick={() => setSide("NO")}
            type="button"
          >
            NO
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Select a range:</div>
        <RangeSlider 
          edges={binEdges}
          onRangeChange={(lowerIndex, upperIndex) => {
            const lowerCents = binEdges[lowerIndex];
            const upperCents = binEdges[upperIndex]; // Use the current edge, not the next one
            setSelectedRange({ lower: lowerCents, upper: upperCents });
            setSelectedBinId(null); // Clear bin selection since we're using custom range
          }}
          formatValue={formatCurrency}
          centsToMillions={centsToMillions}
        />
        {selectedRange && (
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            Range selected: <span className="font-medium">
              {formatCurrency(centsToMillions(selectedRange.lower))} - {formatCurrency(centsToMillions(selectedRange.upper))}
            </span>
          </div>
        )}
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

      <div className="mb-4 text-sm text-slate-700 dark:text-slate-200">
        Potential payout: <span className="font-semibold">{potentialPayout}</span> pts
      </div>

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
  onRangeChange: (lowerIndex: number, upperIndex: number) => void;
  formatValue: (value: number) => string;
  centsToMillions: (cents: number) => number;
}

function RangeSlider({ edges, onRangeChange, formatValue, centsToMillions }: RangeSliderProps) {
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
    const lowerValue = formatValue(centsToMillions(edges[lowerIndex]));
    const upperValue = upperIndex === edges.length - 1 
      ? formatValue(centsToMillions(edges[upperIndex])) + "+"
      : formatValue(centsToMillions(edges[upperIndex]));
    
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
            title={formatValue(centsToMillions(edge))}
          />
        ))}
      </div>
    </div>
  );
}
