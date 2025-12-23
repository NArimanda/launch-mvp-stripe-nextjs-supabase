"use client";


//test comment to determine github status

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Wallet,
  Activity,
  History
} from 'lucide-react';
import Image from 'next/image';

const AUTH_TIMEOUT = 15000; // 15 seconds

interface UserBet {
  id: string;
  market_id: string;
  selected_range: string;
  points: number;
  potential_payout: number;
  status: string;
  outcome: string;
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

export default function Portfolio() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [historyBets, setHistoryBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Add useEffect for auth check
  useEffect(() => {
    if (!user && !isAuthLoading) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Fetch user balance and bets
  useEffect(() => {
    if (!user?.id) return;

    const fetchPortfolioData = async () => {
      try {
        console.log("Fetching portfolio data for user:", user.id);

        // Fetch user balance
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          console.error('Error fetching wallet:', walletError);
        } else {
          console.log('Wallet data:', walletData);
          setBalance(walletData?.balance || 0);
        }

        // Fetch user's pending bets with market and movie info
        const { data: pendingBetsData, error: pendingBetsError } = await supabase
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
              movie_id,
              type,
              timeframe,
              status,
              movies!inner(
                slug,
                release_date,
                image_url
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('outcome', 'pending');

        // Fetch user's history bets (non-pending) with market and movie info
        // Note: Using markets() instead of markets!inner() to ensure outcome is included even if null
        const { data: historyBetsData, error: historyBetsError } = await supabase
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
            markets(
              id,
              movie_id,
              type,
              timeframe,
              status,
              outcome,
              movies(
                slug,
                release_date,
                image_url
              )
            )
          `)
          .eq('user_id', user.id)
          .neq('outcome', 'pending')
          .order('placed_at', { ascending: false });

        console.log('Bets query result:', { pendingBetsData, historyBetsData });

        if (pendingBetsError) {
          console.error('Error fetching pending bets:', pendingBetsError);
        } else {
          console.log('Raw pending bets data:', pendingBetsData);
          console.log('Number of pending bets found:', pendingBetsData?.length || 0);
          
          // Transform the data to flatten the nested structure
          const transformedPendingBets = pendingBetsData?.map(bet => {
            const market = bet.markets as unknown as {
              movie_id: string;
              type: string;
              timeframe: string;
              status: string;
              movies: { slug: string; release_date: string; image_url: string };
            };
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
                status: market?.status || ''
              },
              movie: {
                slug: movie?.slug || '',
                release_date: movie?.release_date || '',
                image_url: movie?.image_url || ''
              }
            };
          }) || [];
          
          setUserBets(transformedPendingBets);
        }

        if (historyBetsError) {
          console.error('Error fetching history bets:', historyBetsError);
        } else {
          console.log('Raw history bets data:', historyBetsData);
          console.log('Number of history bets found:', historyBetsData?.length || 0);
          
          // First, collect all unique market_ids to fetch outcomes separately if needed
          const marketIds = [...new Set(historyBetsData?.map(bet => bet.market_id) || [])];
          console.log('Market IDs to check:', marketIds);
          
          // Fetch market outcomes separately to ensure we get them
          const { data: marketsData, error: marketsError } = await supabase
            .from('markets')
            .select('id, outcome')
            .in('id', marketIds);
          
          console.log('Markets data with outcomes:', marketsData);
          console.log('Markets error:', marketsError);
          
          // Create a map of market_id -> outcome for quick lookup
          const outcomeMap = new Map(
            marketsData?.map(m => [m.id, m.outcome]) || []
          );
          
          // Transform the data to flatten the nested structure
          const transformedHistoryBets = historyBetsData?.map(bet => {
            // Handle both array and object cases for markets
            const marketsData = Array.isArray(bet.markets) ? bet.markets[0] : bet.markets;
            
            const market = marketsData as any;
            
            // Handle movies - could be array or object
            const moviesData = Array.isArray(market?.movies) ? market.movies[0] : market?.movies;
            const movie = moviesData || {};
            
            // Try to get outcome from the market object first, then fallback to the map
            let marketOutcome = market?.outcome;
            if (marketOutcome === undefined || marketOutcome === null) {
              marketOutcome = outcomeMap.get(bet.market_id) ?? null;
            }
            
            console.log(`Bet ${bet.id} - Market ID: ${bet.market_id}`);
            console.log(`  Market object outcome:`, market?.outcome);
            console.log(`  Outcome from map:`, outcomeMap.get(bet.market_id));
            console.log(`  Final outcome:`, marketOutcome);
            
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
                id: market?.id || '',
                movie_id: market?.movie_id || '',
                type: market?.type || '',
                timeframe: market?.timeframe || '',
                status: market?.status || '',
                outcome: marketOutcome !== null && marketOutcome !== undefined ? Number(marketOutcome) : null
              },
              movie: {
                slug: movie?.slug || '',
                release_date: movie?.release_date || '',
                image_url: movie?.image_url || ''
              }
            };
          }) || [];
          
          console.log('Transformed history bets:', transformedHistoryBets);
          
          setHistoryBets(transformedHistoryBets);
        }
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && isAuthLoading) {
        setAuthTimeout(true);
      }
    }, AUTH_TIMEOUT);
    
    return () => clearTimeout(timer);
  }, [user, isAuthLoading]);

  // Update the loading check
  if (!user && isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4 mx-auto"></div>
          <p className="text-foreground">
            {authTimeout ? 
              "Taking longer than usual? Try refreshing the page 😊." :
              "Verifying access..."}
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (points: number) => {
    return points.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
      {/* Portfolio Header */}
      <div className="bg-white dark:bg-neutral-dark border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Portfolio
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Welcome back, {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Balance Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Portfolio Balance
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Available Points</p>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? (
                      <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(balance || 0)
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {loading ? (
                    <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-6 w-16 rounded"></div>
                  ) : (
                    `$${(balance || 0).toFixed(2)}`
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-white dark:bg-neutral-dark rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Pending Bets ({userBets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Bet History ({historyBets.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'pending' ? (
          /* Pending Bets Section */
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Pending Bets ({userBets.length})
            </h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : userBets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-dark rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center"
            >
              <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No Pending Bets
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                You haven&apos;t placed any bets yet. Start predicting movie performance to see your bets here!
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {userBets.map((bet, index) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {/* Movie Poster */}
                    <div className="relative w-16 h-24 flex-shrink-0">
                      {bet.movie.image_url ? (
                        <Image
                          src={bet.movie.image_url}
                          alt={bet.movie.slug}
                          fill
                          className="object-cover rounded-lg"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-slate-500">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Bet Details */}
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Movie</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.movie.slug}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Release Date</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.movie.release_date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Market Type</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.market.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Timeframe</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.market.timeframe}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Selected Range</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.selected_range}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Points</p>
                          <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(bet.points)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Potential Payout</p>
                          <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(bet.potential_payout)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Bet Status</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Outcome</p>
                          <p className="font-medium text-slate-900 dark:text-white">{bet.outcome}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        ) : (
          /* History Section */
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Bet History ({historyBets.length})
            </h2>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : historyBets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-neutral-dark rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center"
              >
                <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No Bet History
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You haven&apos;t completed any bets yet. Your resolved bets will appear here!
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {historyBets.map((bet, index) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-neutral-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Movie Poster */}
                      <div className="relative w-16 h-24 flex-shrink-0">
                        {bet.movie.image_url ? (
                          <Image
                            src={bet.movie.image_url}
                            alt={bet.movie.slug}
                            fill
                            className="object-cover rounded-lg"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-slate-500">No Image</span>
                          </div>
                        )}
                      </div>

                      {/* Bet Details */}
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Movie</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bet.movie.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Placed At</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {bet.placed_at ? new Date(bet.placed_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Market Type</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bet.market.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Timeframe</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bet.market.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Selected Range</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bet.selected_range}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Points</p>
                            <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(bet.points)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Potential Payout</p>
                            <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(bet.potential_payout)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Bet Status</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bet.status}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Bet Result</p>
                            <p className={`font-medium ${
                              bet.outcome === 'won' ? 'text-green-600 dark:text-green-400' :
                              bet.outcome === 'lost' ? 'text-red-600 dark:text-red-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Box Office Outcome</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {bet.market.outcome !== null && bet.market.outcome !== undefined 
                                ? (() => {
                                    const valueInMillions = Number(bet.market.outcome) / 1000000;
                                    return `$${valueInMillions.toFixed(1)}M`;
                                  })()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}