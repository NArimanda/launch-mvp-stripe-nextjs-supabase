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

    // Check if wallets table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'wallets');

    console.log("Table check:", { tableExists, tableError });

    if (tableError || !tableExists || tableExists.length === 0) {
      return NextResponse.json({ 
        error: "Wallets table does not exist",
        tableError: tableError?.message
      });
    }

    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'wallets');

    console.log("Columns:", { columns, columnsError });

    // Try to get all wallets
    const { data: allWallets, error: allWalletsError } = await supabase
      .from('wallets')
      .select('*');

    console.log("All wallets:", { allWallets, allWalletsError });

    // Try to get specific user's wallet
    const { data: userWallet, error: userWalletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id);

    console.log("User wallet:", { userWallet, userWalletError });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      tableExists: tableExists.length > 0,
      columns,
      allWallets,
      userWallet,
      errors: {
        tableError: tableError?.message,
        columnsError: columnsError?.message,
        allWalletsError: allWalletsError?.message,
        userWalletError: userWalletError?.message
      }
    });

  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 