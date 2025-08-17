"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";

type Bin = {
  bin_id: string;
  position: number;
  label: string;
};

export default function BetForm({
  marketId,
  bins,
}: {
  marketId: string;
  bins: Bin[];
}) {
  const { user } = useAuth();
  const [side, setSide] = React.useState<"YES" | "NO">("YES");
  const [selectedBinId, setSelectedBinId] = React.useState<string | null>(bins[0]?.bin_id ?? null);
  const [points, setPoints] = React.useState<number>(50);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

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
    if (!selectedBinId) {
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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bins.map((b) => (
            <button
              key={b.bin_id}
              onClick={() => setSelectedBinId(b.bin_id)}
              type="button"
              className={`text-left px-3 py-2 rounded-lg border ${
                selectedBinId === b.bin_id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <div className="text-sm font-medium">{b.label}</div>
              <div className="text-[11px] text-slate-500">Bin #{b.position}</div>
            </button>
          ))}
        </div>
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
