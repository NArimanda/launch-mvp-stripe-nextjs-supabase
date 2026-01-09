'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardPlayer {
  user_id: string;
  username: string;
  balance: number;
  rank: number;
}

export default function Leaderboard() {
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
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-slate-600 dark:text-slate-400">#{rank}</span>;
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Top Players</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full">
      <div className="flex items-center space-x-2 mb-4">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Top Players</h2>
      </div>
      
      {players.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-400">No players found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.user_id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md ${
                getRankColor(player.rank)
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(player.rank)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium truncate ${
                    player.rank <= 3 ? 'text-white' : 'text-slate-900 dark:text-white'
                  }`}>
                    {player.username}
                  </p>
                </div>
              </div>
              <div className={`text-right ${
                player.rank <= 3 ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}>
                <p className="font-bold text-lg">{formatCurrency(player.balance)}</p>
                <p className="text-xs">points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 