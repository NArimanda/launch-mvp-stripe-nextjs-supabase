// lib/binPresets.ts
export type MarketType = "domestic" | "worldwide";
export type Timeframe = "opening-day" | "weekend" | "week" | "month";

type EdgesMap = Record<MarketType, Record<Timeframe, number[]>>;

// Boundaries in **millions** (last bucket is open-ended)
const EDGES_M: EdgesMap = {
  domestic: {
    "opening-day": [0,1,2,5,10,20,40,60,80,100,150,200,300],
    weekend:       [0,5,10,20,40,60,80,100,150,200,300,400],
    week:          [0,10,20,40,70,100,150,200,300,400,500],
    month:         [0,20,40,80,120,180,240,300,400,500,600],
  },
  worldwide: {
    "opening-day": [0,2,5,10,20,40,80,120,160,200,300,400,500],
    weekend:       [0,10,20,40,80,120,160,200,300,400,500,600],
    week:          [0,20,40,80,120,180,240,300,400,500,600,800],
    month:         [0,40,80,120,200,300,400,500,700,900,1100],
  },
};

export type BinRow = {
  market_id: string;
  bin_id: string;       // stable within a market
  position: number;     // 0-based
  lower_cents: number;  // integer cents
  upper_cents: number | null; // null for open-ended
  is_open_ended: boolean;
  label: string;        // e.g. "$0–$1M", "$300M+"
};

// helper: format numbers like $0–$1M / $300M+
function labelForRange(lowerCents: number, upperCents: number | null): string {
  const toMillions = (cents: number) => (cents / 100 / 1_000_000);
  const fmt = (n: number) =>
    n >= 1000 ? `${(n/1000).toFixed(n % 1000 === 0 ? 0 : 1)}B` : `${n.toFixed(n % 1 === 0 ? 0 : 1)}M`;

  const loM = toMillions(lowerCents);
  if (upperCents == null) return `$${fmt(loM)}+`;
  const hiM = toMillions(upperCents);
  return `$${fmt(loM)}–$${fmt(hiM)}`;
}

/**
 * Build bins for a market from presets.
 * We include marketId in bin_id so each market has unique IDs.
 */
export function buildBinsForMarket(params: {
  marketId: string;
  type: MarketType;
  timeframe: Timeframe;
}): BinRow[] {
  const { marketId, type, timeframe } = params;
  const edges = EDGES_M[type][timeframe]; // millions
  const bins: BinRow[] = [];

  for (let i = 0; i < edges.length; i++) {
    const lowerM = edges[i];
    const upperM = i < edges.length - 1 ? edges[i + 1] : null;

    // convert to cents (millions -> dollars -> cents)
    const lowerCents = lowerM * 1_000_000 * 100;
    const upperCents = upperM == null ? null : upperM * 1_000_000 * 100;

    bins.push({
      market_id: marketId,
      bin_id: `${marketId}:${i}`, // simple and stable
      position: i,
      lower_cents: lowerCents,
      upper_cents: upperCents,
      is_open_ended: upperCents === null,
      label: labelForRange(lowerCents, upperCents),
    });
  }

  return bins;
}
