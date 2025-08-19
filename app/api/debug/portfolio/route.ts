import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Debug - User ID:", user.id);

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['bets', 'markets', 'movies', 'wallets']);

    console.log("Tables check:", { tables, tablesError });

    // Check user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id);

    console.log("Wallet check:", { wallet, walletError });

    // Check user's bets without joins first
    const { data: userBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id);

    console.log("User bets check:", { userBets, betsError });

    // Check if markets table has the expected structure
    const { data: marketsSample, error: marketsError } = await supabase
      .from('markets')
      .select('*')
      .limit(1);

    console.log("Markets sample:", { marketsSample, marketsError });

    // Check if movies table has the expected structure
    const { data: moviesSample, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .limit(1);

    console.log("Movies sample:", { moviesSample, moviesError });

    // Try the complex join query
    if (userBets && userBets.length > 0) {
      const firstBet = userBets[0];
      console.log("Trying join with first bet market_id:", firstBet.market_id);

      const { data: joinedData, error: joinError } = await supabase
        .from('bets')
        .select(`
          id,
          market_id,
          selected_range,
          points,
          potential_payout,
          status,
          created_at,
          markets!inner(
            type,
            timeframe,
            movies!inner(
              title,
              image_url,
              release_date,
              slug
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('id', firstBet.id);

      console.log("Join test:", { joinedData, joinError });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      tables: tables?.map(t => t.table_name),
      wallet,
      userBets,
      marketsSample,
      moviesSample,
      errors: {
        tablesError: tablesError?.message,
        walletError: walletError?.message,
        betsError: betsError?.message,
        marketsError: marketsError?.message,
        moviesError: moviesError?.message
      }
    });

  } catch (error) {
    console.error("Debug portfolio error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 