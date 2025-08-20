'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  closeTime: string | null;
  marketStatus: string;
}

export default function CountdownTimer({ closeTime, marketStatus }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('0:00');

  useEffect(() => {
    // If market is closed or resolved, show 0:00:00
    if (marketStatus === 'closed' || marketStatus === 'resolved' || !closeTime) {
      setTimeLeft('0:00:00');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const closeDate = new Date(closeTime).getTime();
      const difference = closeDate - now;

      if (difference <= 0) {
        setTimeLeft('0:00:00');
        return;
      }

      // Calculate days, hours, and minutes
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      // Format as DD:HH:MM
      setTimeLeft(`${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateTimer();

    // Update every minute (since we're only showing minutes precision)
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [closeTime, marketStatus]);

  return (
    <div className="flex flex-col items-end space-y-1">
      <div className="flex items-center space-x-2">
        <div className="text-sm text-slate-600 dark:text-slate-400">Closes in:</div>
        <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
          {timeLeft}
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        days:hours:minutes
      </div>
    </div>
  );
} 