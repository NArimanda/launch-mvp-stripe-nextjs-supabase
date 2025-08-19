import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Get all bets to see what's in the table
    const { data: allBets, error: allBetsError } = await supabase
      .from('bets')
      .select('*')
      .limit(10);

    // Get unique status values
    const { data: statusValues, error: statusError } = await supabase
      .from('bets')
      .select('status')
      .limit(100);

    const uniqueStatuses = [...new Set(statusValues?.map(bet => bet.status) || [])];

    // Get authenticated user if available
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'bets');

    return NextResponse.json({
      allBets,
      uniqueStatuses,
      tableColumns: columns,
      user: user ? { id: user.id, email: user.email } : null,
      errors: {
        allBetsError: allBetsError?.message,
        statusError: statusError?.message,
        columnsError: columnsError?.message,
        authError: authError?.message
      }
    });

  } catch (error) {
    console.error("Debug bets simple error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 