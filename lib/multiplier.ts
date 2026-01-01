// lib/multiplier.ts
// MVP multiplier logic based on selected bin width

export const MAX_MULT = 3.0;
export const MULT_Q = 4.0; // Power exponent for width-based penalty

/**
 * Compute payout multiplier based on number of bins selected
 * 
 * Formula: multiplier = 1 + (MAX_MULT - 1) * (1 - w)^q
 * 
 * Where:
 * - N = total number of bins
 * - k = number of bins covered by selection (inclusive)
 * - w = k / N (width fraction in [0..1])
 * - MAX_MULT = 3.0 (maximum multiplier)
 * - q = 4.0 (strong compression so wide ranges are near 1)
 * 
 * This formula heavily penalizes wide ranges:
 * - Full range (k == N, w = 1) => multiplier = 1.00
 * - Very wide ranges (80-100% of bins) => multiplier stays close to 1.0 (<= 1.2x)
 * - Only very narrow selections (1-3 bins) approach 3.0x
 * 
 * Edge cases:
 * - If N <= 0: multiplier = 1
 * - If k == N: multiplier = 1.00 exactly
 * - If k == 1: multiplier = MAX_MULT exactly
 * 
 * @param totalBins - Total number of bins (N)
 * @param selectedBins - Number of bins covered by selection (k)
 * @returns Multiplier value clamped to [1, MAX_MULT], rounded to 2 decimals
 */
export function computeMultiplier({
  totalBins,
  selectedBins,
}: {
  totalBins: number;
  selectedBins: number;
}): number {
  // Sanitize inputs
  const N = Math.max(1, Math.floor(totalBins));
  const k = Math.max(1, Math.min(N, Math.floor(selectedBins)));

  // Edge case: N <= 0
  if (N <= 0) {
    return 1.0;
  }

  // Edge case: selecting all bins (k == N) => multiplier = 1.00 exactly
  if (k === N) {
    return 1.0;
  }

  // Edge case: selecting exactly one bin (k == 1) => multiplier = MAX_MULT exactly
  if (k === 1) {
    return MAX_MULT;
  }

  // Compute width fraction
  const w = k / N; // width fraction in [0..1]
  
  // Compute formula: multiplier = 1 + (MAX_MULT - 1) * (1 - w)^q
  const precision = 1 - w; // precision (inverse of width)
  const precisionFactor = Math.pow(precision, MULT_Q);
  const m_base = 1 + (MAX_MULT - 1) * precisionFactor;

  // Clamp to [1, MAX_MULT] and round to 2 decimals
  const clamped = Math.max(1, Math.min(MAX_MULT, m_base));
  return Number(clamped.toFixed(2));
}

// Sanity checks and dev inspection (dev only)
if (process.env.NODE_ENV === 'development') {
  const N = 30;
  
  // Test cases
  const test1 = computeMultiplier({ totalBins: N, selectedBins: N });
  const test2 = computeMultiplier({ totalBins: N, selectedBins: 24 }); // 80%
  const test3 = computeMultiplier({ totalBins: N, selectedBins: 15 }); // 50%
  const test4 = computeMultiplier({ totalBins: N, selectedBins: 3 });
  const test5 = computeMultiplier({ totalBins: N, selectedBins: 1 });
  
  // Assertions
  console.assert(
    test1 === 1.0,
    `Sanity check failed: N=${N}, k=${N} should be 1.00, got ${test1}`
  );
  
  console.assert(
    test2 <= 1.2,
    `Sanity check failed: N=${N}, k=24 (80%) should be <= 1.2, got ${test2}`
  );
  
  console.assert(
    test5 === MAX_MULT,
    `Sanity check failed: N=${N}, k=1 should be ${MAX_MULT}, got ${test5}`
  );
  
  console.assert(
    test4 < MAX_MULT && test4 > 1,
    `Sanity check failed: N=${N}, k=3 should be between 1 and ${MAX_MULT}, got ${test4}`
  );

  // Log inspection values
  console.log('Multiplier curve inspection (N=30):', {
    [`k=${N} (100%)`]: test1,
    [`k=24 (80%)`]: test2,
    [`k=15 (50%)`]: test3,
    [`k=3 (10%)`]: test4,
    [`k=1 (3.3%)`]: test5,
  });
}

