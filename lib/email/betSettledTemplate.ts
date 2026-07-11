import { formatBetRangeDisplay, formatMarketLabel, formatMarketOutcomeMillions } from '@/lib/formatBetRange';

export type BetSettledEmailBet = {
  selectedRange: string;
  points: number;
  outcome: 'won' | 'lost';
  payoutPoints: number | null;
};

export type BetSettledEmailParams = {
  movieTitle: string;
  marketTimeframe: string;
  marketType: string;
  marketOutcome: number;
  bets: BetSettledEmailBet[];
  dashboardUrl: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPoints(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function buildBetSettledSubject(movieTitle: string, bets: BetSettledEmailBet[]): string {
  const hasWin = bets.some((b) => b.outcome === 'won');
  if (hasWin) {
    return `Your bet on ${movieTitle} won!`;
  }
  return `Your bet on ${movieTitle} has settled`;
}

export function buildBetSettledHtml(params: BetSettledEmailParams): string {
  const {
    movieTitle,
    marketTimeframe,
    marketType,
    marketOutcome,
    bets,
    dashboardUrl,
  } = params;

  const marketLabel = formatMarketLabel(marketTimeframe, marketType);
  const outcomeLabel = formatMarketOutcomeMillions(marketOutcome);
  const primaryOutcome = bets.some((b) => b.outcome === 'won') ? 'won' : 'lost';
  const headline =
    primaryOutcome === 'won'
      ? 'Your prediction was correct!'
      : 'Your bet has been settled';

  const betRows = bets
    .map((bet) => {
      const resultLabel = bet.outcome === 'won' ? 'Won' : 'Lost';
      const resultColor = bet.outcome === 'won' ? '#22c55e' : '#ef4444';
      const payoutLine =
        bet.outcome === 'won' && bet.payoutPoints != null && bet.payoutPoints > 0
          ? `<p style="margin:4px 0 0;font-size:14px;color:#a1a1aa;">Payout: <strong style="color:#22c55e;">${formatPoints(bet.payoutPoints)} points</strong></p>`
          : '';

      return `
        <div style="margin-bottom:16px;padding:16px;background:#18181b;border-radius:8px;border:1px solid #27272a;">
          <p style="margin:0 0 8px;font-size:14px;color:#a1a1aa;">Your range</p>
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#fafafa;">${escapeHtml(formatBetRangeDisplay(bet.selectedRange))}</p>
          <p style="margin:0 0 4px;font-size:14px;color:#a1a1aa;">Points bet: <strong style="color:#fafafa;">${formatPoints(bet.points)}</strong></p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;">Result: <strong style="color:${resultColor};">${resultLabel}</strong></p>
          ${payoutLine}
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0b0e;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fafafa;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#a1a1aa;">${escapeHtml(movieTitle)}</p>

    <div style="margin-bottom:24px;padding:16px;background:#18181b;border-radius:8px;border:1px solid #27272a;">
      <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa;">Market</p>
      <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#fafafa;">${escapeHtml(marketLabel)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa;">Actual outcome</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#fafafa;">${escapeHtml(outcomeLabel)}</p>
    </div>

    ${betRows}

    <a href="${escapeHtml(dashboardUrl)}"
       style="display:inline-block;margin-top:8px;padding:12px 24px;background:#ef4444;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:9999px;">
      View your dashboard
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:#71717a;">BoxOfficeCalls — box office prediction markets</p>
  </div>
</body>
</html>
  `.trim();
}
