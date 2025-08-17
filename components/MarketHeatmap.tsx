"use client";
import * as React from "react";

type Bin = {
  bin_id: string;
  position: number;
  label: string;
};

type Stat = {
  selected_bin_id: string | null;
  total_bets: number;
  total_points: number;
  yes_bets: number;
  no_bets: number;
};

export default function MarketHeatmap({
  bins,
  stats,
}: {
  bins: Array<{ bin_id: string; position: number; label: string }>;
  stats: Stat[];
}) {
  const maxPoints = Math.max(1, ...stats.map((s) => s.total_points));

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
      <div className="space-y-3">
        {bins.map((b) => {
          const s = stats.find((x) => x.selected_bin_id === b.bin_id) ?? {
            total_points: 0,
            yes_bets: 0,
            no_bets: 0,
          };
          const widthPct = Math.round((s.total_points / maxPoints) * 100);
          return (
            <div key={b.bin_id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-300">{b.label}</div>
              <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500/70 dark:bg-blue-400/70"
                  style={{ width: `${widthPct}%` }}
                  title={`${s.total_points} pts`}
                />
              </div>
              <div className="w-28 text-right text-xs text-slate-600 dark:text-slate-300">
                {s.total_points} pts • {s.yes_bets}Y/{s.no_bets}N
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
