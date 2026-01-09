"use client";

import { useState, useEffect, useRef, useActionState } from 'react';
import { motion } from 'framer-motion';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Wallet,
  Activity,
  History
} from 'lucide-react';
import Image from 'next/image';
import { restoreBalance } from '@/app/actions/walletActions';

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

interface UserDashboardContentProps {
  username: string;
  pendingBets: UserBet[];
  historyBets: UserBet[];
  balance?: number | null;
  isOwnDashboard?: boolean;
  loading?: boolean;
}

function RestoreBalanceSubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Restoring...' : 'restore balance - 500'}
    </button>
  );
}

function RestoreBalanceForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(restoreBalance, null);
  const prevStateRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  
  // Handle state changes and refresh on success
  useEffect(() => {
    // Only process if state has changed from previous
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      
      // If state is null (success) and we've submitted, refresh
      if (state === null && submittedRef.current) {
        router.refresh();
        submittedRef.current = false; // Reset for next submission
      }
    }
  }, [state, router]);
  
  const handleSubmit = () => {
    submittedRef.current = true;
  };
  
  return (
    <form action={formAction} onSubmit={handleSubmit}>
      {state && state !== null && (
        <div className="mb-2 text-sm text-red-600 dark:text-red-400">
          {state}
        </div>
      )}
      <RestoreBalanceSubmitButton />
    </form>
  );
}

export default function UserDashboardContent({
  username,
  pendingBets,
  historyBets,
  balance,
  isOwnDashboard = false,
  loading = false
}: UserDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

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
              {isOwnDashboard ? 'Portfolio' : `${username}'s Dashboard`}
            </h1>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Balance Section - Only show for own dashboard */}
        {isOwnDashboard && (
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
                <div className="flex items-center space-x-6">
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
                  {/* Restore Balance Button - Only show when eligible */}
                  {balance !== null && balance < 250 && (
                    <RestoreBalanceForm />
                  )}
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
        )}

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
              <span>Pending Bets ({pendingBets.length})</span>
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
              Pending Bets ({pendingBets.length})
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
            ) : pendingBets.length === 0 ? (
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
                  {isOwnDashboard 
                    ? "You haven't placed any bets yet. Start predicting movie performance to see your bets here!"
                    : `${username} hasn't placed any pending bets.`}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {pendingBets.map((bet, index) => (
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
                            <p className="font-medium text-slate-900 dark:text-white">{bet.outcome || 'Pending'}</p>
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
                  {isOwnDashboard 
                    ? "You haven't completed any bets yet. Your resolved bets will appear here!"
                    : `${username} hasn't completed any bets yet.`}
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
                              {bet.outcome ? (bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)) : 'N/A'}
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

