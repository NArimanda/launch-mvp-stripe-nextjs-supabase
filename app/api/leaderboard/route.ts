import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Fetch top 5 players by wallet balance with username from users table
    const { data: walletsData, error: walletsError } = await supabase
      .from('wallets')
      .select('user_id, balance, users(username)')
      .order('balance', { ascending: false })
      .limit(5);

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }

    if (!walletsData || walletsData.length === 0) {
      return NextResponse.json({ players: [] });
    }

    // Transform the data to include rank and username
    const leaderboardData = walletsData.map((wallet, index) => ({
      user_id: wallet.user_id,
      username: wallet.users?.username || 'username not found',
      balance: wallet.balance || 0,
      rank: index + 1
    }));

    return NextResponse.json({ players: leaderboardData });

  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 