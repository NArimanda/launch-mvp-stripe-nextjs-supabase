import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Get existing bets to see what status values are currently used
    const { data: existingBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .limit(5);

    if (betsError) {
      return NextResponse.json({ error: "Failed to get existing bets", details: betsError }, { status: 500 });
    }

    // Try to get table structure by looking at the first bet
    const { data: sampleBet } = await supabase
      .from('bets')
      .select('*')
      .limit(1);

    return NextResponse.json({
      existingBets,
      sampleBet,
      message: "Bets table data"
    });

  } catch (error) {
    console.error("Debug bets error:", error);
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
}

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Try to insert a test bet with different status values to see which one works
    const testBets = [
      { status: 'open', outcome: 'pending' },
      { status: 'closed', outcome: 'pending' },
      { status: 'active', outcome: 'pending' },
      { status: 'inactive', outcome: 'pending' },
      { status: 'pending', outcome: 'pending' },
      { status: 'settled', outcome: 'pending' },
      { status: 'cancelled', outcome: 'pending' },
      { status: 'expired', outcome: 'pending' },
      { status: 'live', outcome: 'pending' },
      { status: 'resolved', outcome: 'pending' },
      { status: 'won', outcome: 'pending' },
      { status: 'lost', outcome: 'pending' },
      { status: 'void', outcome: 'pending' },
      { status: 'draft', outcome: 'pending' },
      { status: 'submitted', outcome: 'pending' },
      { status: 'confirmed', outcome: 'pending' }
    ];

    const results = [];

    for (const testBet of testBets) {
      try {
        const { data, error } = await supabase
          .from('bets')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            market_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            selected_range: '[test]',
            points: 1,
            potential_payout: 3,
            price_multiplier: 3,
            bin_id: null,
            status: testBet.status,
            outcome: testBet.outcome
          })
          .select();

        results.push({
          status: testBet.status,
          outcome: testBet.outcome,
          success: !error,
          error: error?.message || null
        });

        // If successful, delete the test record
        if (!error && data) {
          await supabase.from('bets').delete().eq('id', data[0].id);
        }
      } catch (e) {
        results.push({
          status: testBet.status,
          outcome: testBet.outcome,
          success: false,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }

    return NextResponse.json({
      testResults: results,
      message: "Tested different status values"
    });

  } catch (error) {
    console.error("Test bets error:", error);
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 