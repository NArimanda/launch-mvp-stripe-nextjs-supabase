// lib/boxOfficeRanges.ts
// Single source of truth for box office betting ranges

export type MarketType = "OPENING_WEEKEND" | "ONE_MONTH";

export interface RangeBucket {
  id: string;              // stable slug id like "ow_0_1m" or "m_10_15m"
  label: string;           // human label like "10–12.5M" or "400M+"
  lower: number;           // lower bound in dollars (integer)
  upper: number | null;    // upper bound in dollars (exclusive), null for "+"
  sort: number;            // ascending integer
}

// Helper to format dollar amounts for IDs
function formatIdAmount(millions: number): string {
  if (millions >= 1000) {
    const billions = millions / 1000;
    return `${billions.toFixed(1).replace('.', '_')}b`;
  }
  return `${millions.toFixed(1).replace('.', '_')}m`;
}

// Helper to create label
function createLabel(lowerM: number, upperM: number | null): string {
  if (upperM === null) {
    // Open-ended: "400M+" or "2.5B+"
    if (lowerM >= 1000) {
      const b = lowerM / 1000;
      return b % 1 === 0 ? `${b}B+` : `${b.toFixed(1)}B+`;
    }
    return `${lowerM}M+`;
  }
  
  // Range: "10–12.5M" or "1.0–1.25B"
  const formatValue = (m: number): string => {
    if (m >= 1000) {
      const b = m / 1000;
      return b % 1 === 0 ? `${b}B` : `${b.toFixed(2)}B`;
    }
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  };
  
  return `${formatValue(lowerM)}–${formatValue(upperM)}`;
}

// OPENING_WEEKEND buckets (bounds in MILLIONS, stored as DOLLARS)
const OPENING_WEEKEND_BUCKETS: RangeBucket[] = [];

// A) 0–10M step 1M (10 buckets)
for (let i = 0; i < 10; i++) {
  const lowerM = i;
  const upperM = i + 1;
  OPENING_WEEKEND_BUCKETS.push({
    id: `ow_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: i,
  });
}

// B) 10–30M step 2.5M (8 buckets)
for (let i = 0; i < 8; i++) {
  const lowerM = 10 + i * 2.5;
  const upperM = 10 + (i + 1) * 2.5;
  OPENING_WEEKEND_BUCKETS.push({
    id: `ow_${formatIdAmount(lowerM)}_${formatIdAmount(upperM)}`,
    label: createLabel(lowerM, upperM),
    lower: Math.round(lowerM * 1_000_000),
    upper: Math.round(upperM * 1_000_000),
    sort: 10 + i,
  });
}

// C) 30–80M step 10M (5 buckets)
for (let i = 0; i < 5; i++) {
  const lowerM = 30 + i * 10;
  const upperM = 30 + (i + 1) * 10;
  OPENING_WEEKEND_BUCKETS.push({
    id: `ow_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 18 + i,
  });
}

// D) 80–150M step 25M (3 buckets): 80–105, 105–130, 130–150
for (let i = 0; i < 3; i++) {
  const lowerM = 80 + i * 25;
  const upperM = i === 2 ? 150 : 80 + (i + 1) * 25; // Last bucket ends at 150, not 155
  OPENING_WEEKEND_BUCKETS.push({
    id: `ow_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 23 + i,
  });
}

// E) 150–400M step 50M (5 buckets)
for (let i = 0; i < 5; i++) {
  const lowerM = 150 + i * 50;
  const upperM = 150 + (i + 1) * 50;
  OPENING_WEEKEND_BUCKETS.push({
    id: `ow_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 26 + i,
  });
}

// F) 400M+ (1 bucket)
OPENING_WEEKEND_BUCKETS.push({
  id: `ow_400m_plus`,
  label: createLabel(400, null),
  lower: 400 * 1_000_000,
  upper: null,
  sort: 31,
});

// ONE_MONTH buckets (bounds in MILLIONS, stored as DOLLARS)
const ONE_MONTH_BUCKETS: RangeBucket[] = [];

// A) 0–10M step 1M (10 buckets)
for (let i = 0; i < 10; i++) {
  const lowerM = i;
  const upperM = i + 1;
  ONE_MONTH_BUCKETS.push({
    id: `m_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: i,
  });
}

// B) 10–50M step 5M (8 buckets)
for (let i = 0; i < 8; i++) {
  const lowerM = 10 + i * 5;
  const upperM = 10 + (i + 1) * 5;
  ONE_MONTH_BUCKETS.push({
    id: `m_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 10 + i,
  });
}

// C) 50–200M step 25M (6 buckets)
for (let i = 0; i < 6; i++) {
  const lowerM = 50 + i * 25;
  const upperM = 50 + (i + 1) * 25;
  ONE_MONTH_BUCKETS.push({
    id: `m_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 18 + i,
  });
}

// D) 200–500M step 50M (6 buckets)
for (let i = 0; i < 6; i++) {
  const lowerM = 200 + i * 50;
  const upperM = 200 + (i + 1) * 50;
  ONE_MONTH_BUCKETS.push({
    id: `m_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 24 + i,
  });
}

// E) 500–1000M step 100M (5 buckets)
for (let i = 0; i < 5; i++) {
  const lowerM = 500 + i * 100;
  const upperM = 500 + (i + 1) * 100;
  ONE_MONTH_BUCKETS.push({
    id: `m_${lowerM}_${upperM}m`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 30 + i,
  });
}

// F) 1.0–2.5B step 250M (6 buckets)
for (let i = 0; i < 6; i++) {
  const lowerM = 1000 + i * 250;
  const upperM = 1000 + (i + 1) * 250;
  ONE_MONTH_BUCKETS.push({
    id: `m_${formatIdAmount(lowerM)}_${formatIdAmount(upperM)}`,
    label: createLabel(lowerM, upperM),
    lower: lowerM * 1_000_000,
    upper: upperM * 1_000_000,
    sort: 35 + i,
  });
}

// G) 2.5B+ (1 bucket)
ONE_MONTH_BUCKETS.push({
  id: `m_2_5b_plus`,
  label: createLabel(2500, null),
  lower: 2500 * 1_000_000,
  upper: null,
  sort: 41,
});

export const BOX_OFFICE_RANGES: Record<MarketType, RangeBucket[]> = {
  OPENING_WEEKEND: OPENING_WEEKEND_BUCKETS,
  ONE_MONTH: ONE_MONTH_BUCKETS,
};

/**
 * Get ranges for a market type, sorted by sort order
 */
export function getRanges(marketType: MarketType): RangeBucket[] {
  const ranges = BOX_OFFICE_RANGES[marketType];
  // Defensive sort by sort field
  return [...ranges].sort((a, b) => a.sort - b.sort);
}

/**
 * Find the bucket that contains the given amount (in dollars)
 * Uses: lower <= amount < upper, or lower <= amount if upper is null
 */
export function findBucket(marketType: MarketType, amountDollars: number): RangeBucket | null {
  const ranges = getRanges(marketType);
  for (const bucket of ranges) {
    if (bucket.upper === null) {
      // Open-ended bucket
      if (amountDollars >= bucket.lower) {
        return bucket;
      }
    } else {
      // Regular bucket: lower <= amount < upper
      if (amountDollars >= bucket.lower && amountDollars < bucket.upper) {
        return bucket;
      }
    }
  }
  return null;
}

/**
 * Sanity check function to validate ranges
 * - Ranges are contiguous (next.lower == prev.upper) except final "+"
 * - Sorted order is strictly increasing
 * - No overlaps
 */
export function validateRanges(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [marketType, ranges] of Object.entries(BOX_OFFICE_RANGES)) {
    const sorted = [...ranges].sort((a, b) => a.sort - b.sort);
    
    // Check sort order is strictly increasing
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].sort <= sorted[i - 1].sort) {
        errors.push(`${marketType}: Sort order not strictly increasing at index ${i}`);
      }
    }
    
    // Check contiguity (except for the last bucket which may be open-ended)
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      if (current.upper === null) {
        errors.push(`${marketType}: Non-final bucket has null upper at index ${i}`);
      } else if (current.upper !== next.lower) {
        errors.push(
          `${marketType}: Gap or overlap between buckets at index ${i}: ` +
          `current.upper=${current.upper}, next.lower=${next.lower}`
        );
      }
    }
    
    // Check no overlaps (defensive)
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        
        if (a.upper !== null && b.upper !== null) {
          // Both have upper bounds
          if (
            (a.lower < b.upper && a.upper > b.lower) ||
            (b.lower < a.upper && b.upper > a.lower)
          ) {
            errors.push(
              `${marketType}: Overlap detected between buckets ${a.id} and ${b.id}`
            );
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run validation on module load (development only)
if (process.env.NODE_ENV === 'development') {
  const validation = validateRanges();
  if (!validation.valid) {
    console.error('Box office ranges validation failed:', validation.errors);
  } else {
    console.log('Box office ranges validation passed');
  }
}

