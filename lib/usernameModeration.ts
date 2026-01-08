import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// Initialize the matcher with English dataset and recommended transformers
// This handles leetspeak, separators, and other bypass attempts automatically
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Normalizes a username string for additional profanity scanning.
 * - Converts to lowercase and trims
 * - Replaces common leetspeak characters
 * - Removes all non-alphanumeric characters (including underscores)
 */
export function normalizeUsernameForScan(input: string): string {
  let normalized = input.toLowerCase().trim();
  
  // Replace common leetspeak
  normalized = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't');
  
  // Remove all non-alphanumeric characters (including underscores)
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

/**
 * Checks if a username contains offensive content.
 * Uses obscenity's RegExpMatcher which handles:
 * - Raw profanity detection
 * - Leetspeak variations (via transformers)
 * - Separator bypasses (via transformers)
 * Also performs additional checks on normalized scan string for extra safety
 */
export function isUsernameOffensive(input: string): boolean {
  // Check raw username with obscenity matcher
  // This automatically handles leetspeak, separators, and common bypasses
  if (matcher.hasMatch(input)) {
    return true;
  }
  
  // Additional check on normalized scan string for extra safety
  // (obscenity transformers handle this, but we do it explicitly as well)
  const scanString = normalizeUsernameForScan(input);
  if (scanString !== input.toLowerCase().trim() && matcher.hasMatch(scanString)) {
    return true;
  }
  
  return false;
}

