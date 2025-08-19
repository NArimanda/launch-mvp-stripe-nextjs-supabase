import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Debug: Check what cookies we're receiving
    const cookieHeader = request.headers.get('cookie');
    console.log("Cookie header received:", cookieHeader ? 'Present' : 'Missing');
    
    // Debug: Check authorization header
    const authHeader = request.headers.get('authorization');
    console.log("Authorization header:", authHeader ? 'Present' : 'Missing');
    
    // Try to get user from auth header if cookies don't work
    let user = null;
    let authError = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log("Attempting to get user from token");
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
      user = tokenUser;
      authError = tokenError;
      console.log("Token auth result:", { user: !!user, error: tokenError?.message });
    }
    
    // If token auth failed, try cookie-based auth
    if (!user) {
      console.log("Falling back to cookie-based authentication");
      
      // Debug: Check if we can get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session debug:", { 
        session: !!session, 
        sessionError: sessionError?.message, 
        userId: session?.user?.id,
        sessionExpires: session?.expires_at 
      });

      // Try to refresh the session if it exists but might be expired
      if (session && session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at < now) {
          console.log("Session expired, attempting refresh");
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("Session refresh failed:", refreshError);
          } else {
            console.log("Session refreshed successfully");
          }
        }
      }

      // Get authenticated user from session
      const { data: { user: sessionUser }, error: sessionAuthError } = await supabase.auth.getUser();
      user = sessionUser;
      authError = sessionAuthError;
      console.log("Session auth result:", { user: !!user, error: sessionAuthError?.message });
    }
    
    console.log("Final user debug:", { 
      user: !!user, 
      authError: authError?.message, 
      userId: user?.id,
      userEmail: user?.email 
    });

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
      console.log("No user found in request - session might be expired or invalid");
      return NextResponse.json({ 
        error: "No authenticated user found",
        details: "User session may be expired or invalid"
      }, { status: 401 });
    }

    console.log("User authenticated successfully:", user.id);

    // Debug: Check if we can connect to the database and see tables
    console.log("Database connection test - checking tables...");
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'wallets');
    
    console.log("Tables check result:", { tables, tablesError });

    // Parse request body
    const { market_id, selected_range, points, bins } = await request.json();

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
          } else {
            console.log("Could not extract UUID from bin_id:", matchingBin.bin_id);
          }
        }
      }
    }

    console.log("Calculated bin_id:", bin_id, "from selected_range:", selected_range);

    console.log("About to check wallet for user ID:", user.id, "Type:", typeof user.id);

    // Check if user has enough points in wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    console.log("Wallet check result:", {
      wallet: wallet,
      walletError: walletError,
      userBalance: wallet?.balance,
      requestedPoints: points,
      hasEnoughPoints: wallet ? wallet.balance >= points : false
    });

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create one with default balance
      console.log("Creating new wallet for user:", user.id);
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

      console.log("Wallet created successfully:", newWallet);
      
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

    // Calculate potential payout
    const price_multiplier = 3;
    const potential_payout = points * price_multiplier;

    console.log("About to call RPC function with params:", {
      p_user_id: user.id,
      p_market_id: market_id,
      p_selected_range: selected_range,
      p_points: points,
      p_potential_payout: potential_payout,
      p_price_multiplier: price_multiplier,
      p_bin_id: bin_id // Pass the calculated bin_id
    });

    // Start a transaction: deduct points and insert bet
    const { error: transactionError } = await supabase.rpc('place_bet_transaction', {
      p_user_id: user.id,
      p_market_id: market_id,
      p_selected_range: selected_range,
      p_points: points,
      p_potential_payout: potential_payout,
      p_price_multiplier: price_multiplier,
      p_bin_id: bin_id // Pass the calculated bin_id
    });

    console.log("RPC call completed, error:", transactionError);

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      console.error("Transaction error details:", {
        message: transactionError.message,
        details: transactionError.details,
        hint: transactionError.hint,
        code: transactionError.code
      });
      return NextResponse.json({ 
        error: "Failed to place bet",
        details: transactionError.message
      }, { status: 500 });
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