'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UnresolveMarketButtonProps {
  marketId: string;
  marketStatus: string;
}

export default function UnresolveMarketButton({ marketId, marketStatus }: UnresolveMarketButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin === true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user?.id]);

  // Show toast and auto-hide after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleUnresolve = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('unresolve_market', {
        p_market_id: marketId
      });

      if (error) {
        throw error;
      }

      setToast({ message: 'Market reopened', type: 'success' });
      setShowConfirm(false);
      
      // Refresh the page after a short delay to show the toast
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Error unresolving market:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to unresolve market',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show button if market is resolved and user is admin
  if (marketStatus !== 'resolved' || !isAdmin) {
    return null;
  }

  return (
    <>
      <div className="mt-2">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <span className="text-xs bg-orange-800 px-1.5 py-0.5 rounded">TESTING ONLY</span>
          Unresolve Market
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Confirm Unresolve Market
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This will undo all settlements and wallet credits for this market. Continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnresolve}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
}

