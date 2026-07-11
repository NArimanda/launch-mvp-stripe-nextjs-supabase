/** Display stored range (e.g. "10-30", "[10 - 30]", "400+") as "$10 million – $30 million". Values are box office millions. */
export function formatBetRangeDisplay(selectedRange: string): string {
  const cleaned = selectedRange.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return selectedRange;

  const millionPart = (n: number) => {
    if (!Number.isFinite(n)) return null;
    const s = Number.isInteger(n)
      ? n.toLocaleString()
      : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `$${s} million`;
  };

  if (cleaned.endsWith('+')) {
    const raw = cleaned.slice(0, -1).trim();
    const n = parseFloat(raw);
    const part = millionPart(n);
    return part ? `${part}+` : selectedRange;
  }

  const parts = cleaned.split(/\s*[-–]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    const left = millionPart(a);
    const right = millionPart(b);
    if (left && right) return `${left} – ${right}`;
    return selectedRange;
  }

  const single = parseFloat(cleaned);
  const one = millionPart(single);
  return one ?? selectedRange;
}

export function formatMarketOutcomeMillions(outcome: number): string {
  const millions = outcome / 1_000_000;
  const s = Number.isInteger(millions)
    ? millions.toLocaleString()
    : millions.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `$${s} million`;
}

export function formatMarketLabel(timeframe: string, type: string): string {
  const tf = timeframe.toLowerCase();
  const t = type.charAt(0).toUpperCase() + type.slice(1);
  if (tf === 'weekend') return `Opening Weekend (${t})`;
  if (tf === 'month') return `First Month (${t})`;
  return `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} (${t})`;
}
