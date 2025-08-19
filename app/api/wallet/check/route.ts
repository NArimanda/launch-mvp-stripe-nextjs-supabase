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

    // Check if user has a wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create one with default balance
      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          balance: 1000 // Default starting balance
        })
        .select("balance")
        .single();

      if (createError) {
        console.error("Error creating wallet:", createError);
        return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 });
      }

      return NextResponse.json({ 
        wallet: newWallet,
        message: "Wallet created with 1000 points"
      });
    }

    if (walletError) {
      console.error("Error checking wallet:", walletError);
      return NextResponse.json({ error: "Failed to check wallet" }, { status: 500 });
    }

    return NextResponse.json({ 
      wallet,
      message: "Wallet found"
    });

  } catch (error) {
    console.error("Wallet check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 