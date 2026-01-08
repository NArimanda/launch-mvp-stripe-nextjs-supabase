import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { placeBetAction } from "@/app/actions/betActions";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Try to get user from auth header if cookies don't work
    let user = null;
    let authError = null;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
      user = tokenUser;
      authError = tokenError;
    }
    
    // If token auth failed, try cookie-based auth
    if (!user) {
      // Use getUser() instead of getSession() for cookie-based auth
      const { data: { user: sessionUser }, error: sessionAuthError } = await supabase.auth.getUser();
      user = sessionUser;
      authError = sessionAuthError;
    }

    if (authError) {
      console.error("Auth error details:", {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      return NextResponse.json({ 
        error: "Authentication error", 
        details: authError.message,
        status: authError.status 
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ 
        error: "No authenticated user found",
        details: "User session may be expired or invalid"
      }, { status: 401 });
    }

    // Parse request body
    const { market_id, selected_range, points, price_multiplier, bins } = await request.json();

    // Validate required fields
    if (!market_id || !selected_range || !points || points < 1) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Calculate bin_id based on selected range
    let bin_id = null;
    if (bins && Array.isArray(bins)) {
      // Extract the range values from the selected_range string
      const rangeMatch = selected_range.match(/\[([\d.]+) - ([\d.]+)\]/);
      if (rangeMatch) {
        const lowerValue = parseFloat(rangeMatch[1]);
        const upperValue = parseFloat(rangeMatch[2]);
        
        // Find the bin that matches this range
        const matchingBin = bins.find(bin => {
          const binLower = bin.lower_cents / 100 / 1_000_000; // Convert to millions
          const binUpper = bin.upper_cents ? bin.upper_cents / 100 / 1_000_000 : Infinity;
          return binLower === lowerValue && binUpper === upperValue;
        });
        
        if (matchingBin) {
          // Extract only the UUID part before the colon
          const binIdMatch = matchingBin.bin_id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
          if (binIdMatch) {
            bin_id = binIdMatch[1]; // Use only the UUID part
          }
        }
      }
    }

    // Check if user has enough points in wallet
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
      
      // Check if the new wallet has enough points
      if (newWallet.balance < points) {
        console.error("Insufficient points in new wallet:", {
          userBalance: newWallet.balance,
          requestedPoints: points,
          shortfall: points - newWallet.balance
        });
        return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
      }
    } else if (walletError || !wallet) {
      console.error("Wallet not found for user:", user.id);
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    } else if (wallet.balance < points) {
      console.error("Insufficient points:", {
        userBalance: wallet.balance,
        requestedPoints: points,
        shortfall: points - wallet.balance
      });
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }

    // Calculate potential payout using multiplier from request (or default to 1 for backward compatibility)
    const multiplier = price_multiplier && typeof price_multiplier === 'number' && price_multiplier >= 1 && price_multiplier <= 3
      ? price_multiplier
      : 1; // Fallback for backward compatibility (conservative default)
    const potential_payout = Math.round(points * multiplier);

    // Call Server Action to place bet (includes cooldown check, wallet deduction, and bet insertion)
    const result = await placeBetAction(
      market_id,
      selected_range,
      points,
      potential_payout,
      price_multiplier,
      bin_id
    );

    if ('error' in result) {
      // Handle cooldown error with friendly message
      if (result.error.includes('Please wait') && result.error.includes('before placing another bet')) {
        return NextResponse.json({ 
          error: "Bet cooldown",
          details: result.error
        }, { status: 400 });
      }
      
      // Handle other errors
      const statusCode = result.error === 'Not authenticated' ? 401 :
                        result.error === 'Insufficient points' || result.error === 'Wallet not found' ? 400 : 500;
      
      return NextResponse.json({ 
        error: "Failed to place bet",
        details: result.error
      }, { status: statusCode });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Bet placed successfully",
      potential_payout 
    });

  } catch (error) {
    console.error("Bet placement error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 