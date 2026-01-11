'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardPlayer {
  user_id: string;
  username: string;
  balance: number;
  rank: number;
}

function CompactLeaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();

        if (data.error) {
          console.error('Error fetching leaderboard:', data.error);
          return;
        }

        setPlayers(data.players || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const formatCurrency = (points: number) => {
    return points.toLocaleString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-slate-600 dark:text-slate-400">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Players</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Players</h3>
      </div>
      
      {players.length === 0 ? (
        <div className="text-center py-4">
          <Trophy className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No players found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.slice(0, 5).map((player) => (
            <div
              key={player.user_id}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all hover:shadow-md ${
                getRankColor(player.rank)
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-6 h-6">
                  {getRankIcon(player.rank)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${
                    player.rank <= 3 ? 'text-white' : 'text-slate-900 dark:text-white'
                  }`}>
                    {player.username}
                  </p>
                </div>
              </div>
              <div className={`text-right ${
                player.rank <= 3 ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}>
                <p className="font-bold text-sm">{formatCurrency(player.balance)}</p>
                <p className="text-xs">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstructionsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
      {/* Left column - Primary instructions */}
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 h-full min-h-[240px] flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Select an upcoming movie to place a prediction
          </h2>
          <p className="text-base text-slate-700 dark:text-slate-300">
            <Link
              href="https://substack.com/@boxofficebandits?"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline underline-offset-2 transition-colors"
            >
              Get reminders before every box office weekend
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right column - Sized down leaderboard */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 h-full min-h-[240px]">
          <CompactLeaderboard />
        </div>
      </div>
    </div>
  );
}
