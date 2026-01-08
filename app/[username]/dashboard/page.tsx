import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import UserDashboardContent from '@/components/dashboard/UserDashboardContent';

interface UserDashboardPageProps {
  params: Promise<{ username: string }>;
}

interface UserBet {
  id: string;
  market_id: string;
  selected_range: string;
  points: number;
  potential_payout: number;
  status: string;
  outcome: string | null;
  placed_at?: string;
  market: {
    movie_id: string;
    type: string;
    timeframe: string;
    status: string;
    outcome?: number | null;
  };
  movie: {
    slug: string;
    release_date: string;
    image_url: string;
  };
}

export default async function UserDashboardPage({ params }: UserDashboardPageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Normalize username: decode, trim, lowercase
  const usernameParam = decodeURIComponent(username).trim().toLowerCase();

  // Get the current user (viewer) to check if they're an admin
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let viewerIsAdmin = false;
  
  if (authUser) {
    const { data: viewerProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single();
    
    viewerIsAdmin = viewerProfile?.is_admin === true;
  }

  // Check if the target user exists (exact match with normalized username)
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('id, username, is_banned')
    .eq('username', usernameParam)
    .maybeSingle();

  if (userError || !targetUser) {
    notFound();
  }

  // If user is banned and viewer is not admin, return 404 (shadow ban)
  if (targetUser.is_banned && !viewerIsAdmin) {
    notFound();
  }

  // Fetch user's bets using direct queries with joins
  const { data: betsData, error: betsError } = await supabase
    .from('bets')
    .select(`
      id,
      market_id,
      selected_range,
      points,
      potential_payout,
      status,
      outcome,
      placed_at,
      markets!inner(
        id,
        movie_id,
        type,
        timeframe,
        status,
        outcome,
        movies!inner(
          id,
          slug,
          title,
          release_date,
          image_url
        )
      )
    `)
    .eq('user_id', targetUser.id)
    .order('placed_at', { ascending: false });

  if (betsError) {
    console.error('Error fetching user dashboard:', betsError);
    // Continue with empty arrays instead of erroring out
  }

  // Transform the nested Supabase response structure to flat UserBet format
  const transformedBets: UserBet[] = (betsData || []).map((bet: any) => {
    const market = bet.markets;
    const movie = market?.movies;
    
    return {
      id: bet.id,
      market_id: bet.market_id,
      selected_range: bet.selected_range,
      points: bet.points,
      potential_payout: bet.potential_payout,
      status: bet.status,
      outcome: bet.outcome,
      placed_at: bet.placed_at,
      market: {
        movie_id: market?.movie_id || '',
        type: market?.type || '',
        timeframe: market?.timeframe || '',
        status: market?.status || '',
        outcome: market?.outcome !== null && market?.outcome !== undefined 
          ? Number(market.outcome) 
          : null
      },
      movie: {
        slug: movie?.slug || '',
        release_date: movie?.release_date || '',
        image_url: movie?.image_url || ''
      }
    };
  });
  
  // Separate pending and history bets
  // Pending: outcome is null OR outcome === 'pending'
  // History: outcome is NOT null AND outcome !== 'pending'
  const pendingBets = transformedBets.filter(bet => 
    bet.outcome === null || bet.outcome === 'pending'
  );
  const historyBets = transformedBets.filter(bet => 
    bet.outcome !== null && bet.outcome !== 'pending'
  );

  // Check if this is the viewer's own dashboard
  const isOwnDashboard = authUser?.id === targetUser.id;

  // Fetch balance only if it's own dashboard
  let balance: number | null = null;
  if (isOwnDashboard && authUser) {
    const { data: walletData } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', authUser.id)
      .single();
    
    balance = walletData?.balance || 0;
  }

  return (
    <UserDashboardContent
      username={targetUser.username}
      pendingBets={pendingBets}
      historyBets={historyBets}
      balance={balance}
      isOwnDashboard={isOwnDashboard}
      loading={false}
    />
  );
}
