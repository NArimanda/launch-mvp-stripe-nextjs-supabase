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
import html2canvas from 'html2canvas';

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
  totalPredictions: number;
  pendingPredictions: number;
  settledPredictions: number;
  predictionAccuracy?: number | null;
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

interface StatsCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  availablePoints: number;
  totalValue: number;
  predictionAccuracy?: number | null;
  totalPredictions: number;
  pendingPredictions: number;
}

function StatsCardModal({
  isOpen,
  onClose,
  username,
  availablePoints,
  totalValue,
  predictionAccuracy,
  totalPredictions,
  pendingPredictions
}: StatsCardModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const accuracyPercent = predictionAccuracy != null ? (predictionAccuracy * 100).toFixed(1) : '--';

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0B0B0E',
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'stats-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Failed to generate stats card image:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-cinema-card border border-cinema-border text-cinema-text rounded-xl shadow-cinema-card w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cinema-border">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cinema-textMuted">
            Stats Card Preview
          </h3>
          <button
            onClick={onClose}
            className="text-cinema-textMuted hover:text-cinema-text text-sm px-2 py-1 rounded-md hover:bg-cinema-cardHighlight"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div
            ref={cardRef}
            className="bg-cinema-cardHighlight rounded-lg px-6 py-5 shadow-inner border border-cinema-border"
          >
            <h4 className="text-base font-semibold mb-4 tracking-wide text-cinema-text">
              Box Office Bandits – Stats
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Username</span>
                <span className="font-medium text-cinema-text">{username}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Available Points</span>
                <span className="font-medium text-cinema-text">
                  {availablePoints.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Total Value</span>
                <span className="font-medium text-emerald-400">
                  ${totalValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Prediction Accuracy</span>
                <span className="font-medium text-cinema-text">
                  {accuracyPercent}
                  {accuracyPercent !== '--' ? '%' : ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Total Predictions</span>
                <span className="font-medium text-cinema-text">
                  {totalPredictions.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Pending Predictions</span>
                <span className="font-medium text-cinema-text">
                  {pendingPredictions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BetCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: UserBet;
  isHistory: boolean;
}

function BetCardModal({
  isOpen,
  onClose,
  bet,
  isHistory,
}: BetCardModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0B0B0E',
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bet-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Failed to generate bet card image:', err);
    }
  };

  const formattedPlacedAt = bet.placed_at
    ? new Date(bet.placed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-cinema-card border border-cinema-border text-cinema-text rounded-xl shadow-cinema-card w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cinema-border">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cinema-textMuted">
            {isHistory ? 'Bet Card – Settled' : 'Bet Card – Pending'}
          </h3>
          <button
            onClick={onClose}
            className="text-cinema-textMuted hover:text-cinema-text text-sm px-2 py-1 rounded-md hover:bg-cinema-cardHighlight"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div
            ref={cardRef}
            className="bg-cinema-cardHighlight rounded-lg px-6 py-5 shadow-inner border border-cinema-border"
          >
            <h4 className="text-base font-semibold mb-4 tracking-wide text-cinema-text">
              Box Office Bandits – Bet
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Movie Title</span>
                <span className="font-medium text-cinema-text">{bet.movie.slug}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Release Date</span>
                <span className="font-medium text-cinema-text">{bet.movie.release_date}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Market Type</span>
                <span className="font-medium text-cinema-text">{bet.market.type}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Timeframe</span>
                <span className="font-medium text-cinema-text">{bet.market.timeframe}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Selected Range</span>
                <span className="font-medium text-cinema-text">{bet.selected_range}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Points Wagered</span>
                <span className="font-medium text-cinema-text">
                  {bet.points.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Potential Payout</span>
                <span className="font-medium text-emerald-400">
                  {bet.potential_payout.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Bet Status</span>
                <span className="font-medium text-cinema-text">{bet.status}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Outcome</span>
                <span className="font-medium text-cinema-text">
                  {bet.outcome || 'Pending'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-cinema-textMuted">Placed At</span>
                <span className="font-medium text-cinema-text">
                  {formattedPlacedAt}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardContent({
  username,
  pendingBets,
  historyBets,
  balance,
  isOwnDashboard = false,
  loading = false,
  totalPredictions,
  pendingPredictions,
  settledPredictions,
  predictionAccuracy
}: UserDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeBetModal, setActiveBetModal] = useState<{ bet: UserBet; isHistory: boolean } | null>(null);

  const totalValue = (balance ?? 0) + pendingBets.reduce((sum, b) => sum + b.points, 0);
  const accuracyPercent = predictionAccuracy != null ? (predictionAccuracy * 100).toFixed(1) : null;

  const formatCurrency = (points: number) => {
    return points.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-cinema-page">
      {/* Portfolio Header */}
      <div className="bg-cinema-card border-b border-cinema-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cinema-text">
              {isOwnDashboard ? 'Portfolio' : `${username}'s Dashboard`}
            </h1>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Balance Section - show for own and other user dashboards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-cinema-text">
              Portfolio Balance
            </h2>
            {isOwnDashboard && (
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(true)}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-cinema-border text-cinema-text hover:bg-cinema-cardHighlight transition-colors"
              >
                View Stats Card
              </button>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-900/30 rounded-lg border border-cinema-border">
                    <Wallet className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-cinema-textMuted">Available Points</p>
                    <div className="text-2xl font-bold text-cinema-text">
                      {loading ? (
                        <div className="animate-pulse bg-cinema-cardHighlight h-8 w-24 rounded"></div>
                      ) : (
                        formatCurrency(balance || 0)
                      )}
                    </div>
                  </div>
                </div>
                {/* Restore Balance Button - only on own dashboard when eligible */}
                {isOwnDashboard && balance != null && balance < 250 && (
                  <RestoreBalanceForm />
                )}
              </div>
              <div className="text-right space-y-1">
                <div>
                  <p className="text-sm text-cinema-textMuted">Total Value</p>
                  <div className="text-lg font-semibold text-green-400">
                    {loading ? (
                      <div className="animate-pulse bg-cinema-cardHighlight h-6 w-16 rounded"></div>
                    ) : (
                      `$${totalValue.toFixed(2)}`
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-cinema-textMuted space-y-0.5">
                  <div>
                    Prediction Accuracy:{' '}
                    {accuracyPercent != null ? `${accuracyPercent}%` : '--'}
                  </div>
                  <div>
                    Total Predictions: {totalPredictions}
                  </div>
                  <div>
                    Pending Predictions: {pendingPredictions}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-cinema-card rounded-lg p-1 border border-cinema-border">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-cinema-cardHighlight text-cinema-accent'
                  : 'text-cinema-textMuted hover:text-cinema-text'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Pending Bets ({pendingBets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-cinema-cardHighlight text-cinema-accent'
                  : 'text-cinema-textMuted hover:text-cinema-text'
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
            <h2 className="text-xl font-semibold text-cinema-text mb-4">
              Pending Bets ({pendingBets.length})
            </h2>
          
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border">
                    <div className="animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-cinema-cardHighlight rounded w-3/4"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/2"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingBets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cinema-card rounded-xl p-8 shadow-cinema-card border border-cinema-border text-center"
              >
                <Activity className="h-12 w-12 text-cinema-textMuted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cinema-text mb-2">
                  No Pending Bets
                </h3>
                <p className="text-cinema-textMuted">
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
                    className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border hover:shadow-cinema-card-hover transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Movie Poster */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
                        {bet.movie.image_url ? (
                          <Image
                            src={bet.movie.image_url}
                            alt={bet.movie.slug}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-cinema-textMuted">No poster</span>
                          </div>
                        )}
                      </div>

                      {/* Bet Details */}
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-cinema-textMuted">Movie</p>
                            <p className="font-medium text-cinema-text">{bet.movie.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Release Date</p>
                            <p className="font-medium text-cinema-text">{bet.movie.release_date}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Market Type</p>
                            <p className="font-medium text-cinema-text">{bet.market.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Timeframe</p>
                            <p className="font-medium text-cinema-text">{bet.market.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Selected Range</p>
                            <p className="font-medium text-cinema-text">{bet.selected_range}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Points</p>
                            <p className="font-medium text-cinema-text">{formatCurrency(bet.points)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Potential Payout</p>
                            <p className="font-medium text-green-400">{formatCurrency(bet.potential_payout)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Status</p>
                            <p className="font-medium text-cinema-text">{bet.status}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Outcome</p>
                            <p className="font-medium text-cinema-text">{bet.outcome || 'Pending'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Placed At</p>
                            <p className="font-medium text-cinema-text">
                              {bet.placed_at ? new Date(bet.placed_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveBetModal({ bet, isHistory: false })}
                        className="inline-flex text-xs text-cinema-accent hover:underline"
                      >
                        View Bet Card
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* History Section */
          <div>
            <h2 className="text-xl font-semibold text-cinema-text mb-4">
              Bet History ({historyBets.length})
            </h2>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border">
                    <div className="animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-cinema-cardHighlight rounded w-3/4"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/2"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : historyBets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cinema-card rounded-xl p-8 shadow-cinema-card border border-cinema-border text-center"
              >
                <History className="h-12 w-12 text-cinema-textMuted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cinema-text mb-2">
                  No Bet History
                </h3>
                <p className="text-cinema-textMuted">
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
                    className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border hover:shadow-cinema-card-hover transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Movie Poster */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
                        {bet.movie.image_url ? (
                          <Image
                            src={bet.movie.image_url}
                            alt={bet.movie.slug}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-cinema-textMuted">No poster</span>
                          </div>
                        )}
                      </div>

                      {/* Bet Details */}
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-cinema-textMuted">Movie</p>
                            <p className="font-medium text-cinema-text">{bet.movie.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Placed At</p>
                            <p className="font-medium text-cinema-text">
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
                            <p className="text-sm text-cinema-textMuted">Market Type</p>
                            <p className="font-medium text-cinema-text">{bet.market.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Timeframe</p>
                            <p className="font-medium text-cinema-text">{bet.market.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Selected Range</p>
                            <p className="font-medium text-cinema-text">{bet.selected_range}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Points</p>
                            <p className="font-medium text-cinema-text">{formatCurrency(bet.points)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Potential Payout</p>
                            <p className="font-medium text-green-400">{formatCurrency(bet.potential_payout)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Status</p>
                            <p className="font-medium text-cinema-text">{bet.status}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Result</p>
                            <p className={`font-medium ${
                              bet.outcome === 'won' ? 'text-green-400' :
                              bet.outcome === 'lost' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {bet.outcome ? (bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Box Office Outcome</p>
                            <p className="font-medium text-cinema-text">
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
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveBetModal({ bet, isHistory: true })}
                        className="inline-flex text-xs text-cinema-accent hover:underline"
                      >
                        View Bet Card
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Card Modal - own dashboard only */}
      {isOwnDashboard && (
        <StatsCardModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          username={username}
          availablePoints={balance || 0}
          totalValue={totalValue}
          predictionAccuracy={predictionAccuracy}
          totalPredictions={totalPredictions}
          pendingPredictions={pendingPredictions}
        />
      )}

      {/* Bet Card Modal for individual bets */}
      {activeBetModal && (
        <BetCardModal
          isOpen={true}
          onClose={() => setActiveBetModal(null)}
          bet={activeBetModal.bet}
          isHistory={activeBetModal.isHistory}
        />
      )}
    </div>
  );
}

