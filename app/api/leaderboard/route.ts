import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Fetch top 5 players by wallet balance
    const { data: walletsData, error: walletsError } = await supabase
      .from('wallets')
      .select('user_id, balance, email')
      .order('balance', { ascending: false })
      .limit(5);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }

    if (!walletsData || walletsData.length === 0) {
      return NextResponse.json({ players: [] });
    }

    // Transform the data to include rank and email
    const leaderboardData = walletsData.map((wallet, index) => ({
      email: wallet.email || `Player ${index + 1}`,
      balance: wallet.balance || 0,
      rank: index + 1
    }));

    return NextResponse.json({ players: leaderboardData });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 