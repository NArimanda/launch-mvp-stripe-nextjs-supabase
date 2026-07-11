import { supabaseAdmin } from '@/utils/supabase-admin';
import { getFromEmail, getResend } from '@/lib/email/resend';
import {
  buildBetSettledHtml,
  buildBetSettledSubject,
  type BetSettledEmailBet,
} from '@/lib/email/betSettledTemplate';

const BET_SELECT = `
  id,
  user_id,
  selected_range,
  points,
  outcome,
  settled_payout_points,
  markets!inner(
    type,
    timeframe,
    outcome,
    movies!inner(title)
  )
`;

type SettledBetRow = {
  id: string;
  user_id: string;
  selected_range: string;
  points: number;
  outcome: string;
  settled_payout_points: number | null;
  markets: {
    type: string;
    timeframe: string;
    outcome: number | null;
    movies: { title: string } | { title: string }[];
  };
};

function normalizeSettledBetRow(raw: Record<string, unknown>): SettledBetRow | null {
  const marketsRaw = raw.markets;
  const markets = Array.isArray(marketsRaw) ? marketsRaw[0] : marketsRaw;
  if (!markets || typeof markets !== 'object') return null;

  const m = markets as Record<string, unknown>;
  const moviesRaw = m.movies;
  const movies = Array.isArray(moviesRaw) ? moviesRaw[0] : moviesRaw;

  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    selected_range: String(raw.selected_range),
    points: Number(raw.points),
    outcome: String(raw.outcome),
    settled_payout_points:
      raw.settled_payout_points != null ? Number(raw.settled_payout_points) : null,
    markets: {
      type: String(m.type),
      timeframe: String(m.timeframe),
      outcome: m.outcome != null ? Number(m.outcome) : null,
      movies: movies as { title: string },
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMovieTitle(markets: SettledBetRow['markets']): string {
  const movies = markets.movies;
  if (Array.isArray(movies)) return movies[0]?.title ?? 'Unknown movie';
  return movies.title ?? 'Unknown movie';
}

async function fetchSettledBets(marketId: string): Promise<SettledBetRow[]> {
  const { data, error } = await supabaseAdmin
    .from('bets')
    .select(BET_SELECT)
    .eq('market_id', marketId)
    .in('outcome', ['won', 'lost']);

  if (error) {
    console.error('[notifyBetSettlement] fetch bets error:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => normalizeSettledBetRow(row as Record<string, unknown>))
    .filter((row): row is SettledBetRow => row != null);
}

async function pollSettledBets(marketId: string): Promise<SettledBetRow[]> {
  const attempts = 3;
  const delayMs = 300;

  for (let i = 0; i < attempts; i++) {
    const bets = await fetchSettledBets(marketId);
    if (bets.length > 0) return bets;
    if (i < attempts - 1) await sleep(delayMs);
  }

  return [];
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!authError && authData?.user?.email) {
    return authData.user.email;
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  return profile?.email ?? null;
}

function groupBetsByUser(bets: SettledBetRow[]): Map<string, SettledBetRow[]> {
  const map = new Map<string, SettledBetRow[]>();
  for (const bet of bets) {
    const list = map.get(bet.user_id) ?? [];
    list.push(bet);
    map.set(bet.user_id, list);
  }
  return map;
}

/**
 * Send settlement emails to all bettors on a market. Safe to call fire-and-forget;
 * errors are logged and never thrown.
 */
export async function notifyBetSettlement(marketId: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[notifyBetSettlement] RESEND_API_KEY not set; skipping emails');
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const dashboardUrl = `${appUrl}/dashboard`;

    const bets = await pollSettledBets(marketId);
    if (bets.length === 0) {
      console.warn('[notifyBetSettlement] no settled bets found for market', marketId);
      return;
    }

    const byUser = groupBetsByUser(bets);
    const resend = getResend();
    const from = getFromEmail();

    for (const [userId, userBets] of byUser) {
      try {
        const email = await resolveUserEmail(userId);
        if (!email) {
          console.warn('[notifyBetSettlement] no email for user', userId);
          continue;
        }

        const first = userBets[0];
        const movieTitle = normalizeMovieTitle(first.markets);
        const marketOutcome = first.markets.outcome ?? 0;

        const emailBets: BetSettledEmailBet[] = userBets.map((b) => ({
          selectedRange: b.selected_range,
          points: Number(b.points),
          outcome: b.outcome as 'won' | 'lost',
          payoutPoints: b.settled_payout_points != null ? Number(b.settled_payout_points) : null,
        }));

        const subject = buildBetSettledSubject(movieTitle, emailBets);
        const html = buildBetSettledHtml({
          movieTitle,
          marketTimeframe: first.markets.timeframe,
          marketType: first.markets.type,
          marketOutcome,
          bets: emailBets,
          dashboardUrl,
        });

        const { error: sendError } = await resend.emails.send({
          from,
          to: email,
          subject,
          html,
        });

        if (sendError) {
          console.error('[notifyBetSettlement] send failed:', userId, sendError);
        }
      } catch (userErr) {
        console.error('[notifyBetSettlement] user notification error:', userId, userErr);
      }
    }
  } catch (err) {
    console.error('[notifyBetSettlement] unexpected error:', err);
  }
}
