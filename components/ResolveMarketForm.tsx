'use client';

import { useState, useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { setMarketOutcome } from '@/app/actions/marketActions';

interface ResolveMarketFormProps {
  marketId: string;
  marketStatus: string;
}

export default function ResolveMarketForm({ marketId, marketStatus }: ResolveMarketFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [outcomeValue, setOutcomeValue] = useState<string>('');
  const [state, formAction] = useActionState(setMarketOutcome, null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [prevState, setPrevState] = useState<string | null>(null);

  // Check admin status (for conditional rendering only - server action enforces auth)
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

  // Handle server action result
  useEffect(() => {
    // Only react to state changes, not initial render
    if (state !== prevState) {
      if (state === null && prevState !== null) {
        // Success - state changed from error to null (success)
        setToast({ message: 'Outcome updated', type: 'success' });
        setOutcomeValue('');
        // Refresh the page after a short delay to show the toast
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else if (state) {
        // Error - show error toast
        setToast({
          message: state,
          type: 'error'
        });
      }
      setPrevState(state);
    }
  }, [state, prevState, router]);

  // Show toast and auto-hide after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Only show form if user is admin and market is not resolved
  if (!isAdmin || marketStatus === 'resolved') {
    return null;
  }

  return (
    <>
      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
          Set Market Outcome (Admin Only)
        </h3>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="marketId" value={marketId} />
          <div>
            <label htmlFor="outcome-input" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
              Dollar Amount
            </label>
            <input
              id="outcome-input"
              name="outcome"
              type="text"
              value={outcomeValue}
              onChange={(e) => {
                setOutcomeValue(e.target.value);
              }}
              placeholder="e.g., 150000000 or 150M"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {state && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter the dollar amount (e.g., 150000000 for $150M). Decimals allowed.
            </p>
          </div>
          <button
            type="submit"
            disabled={!outcomeValue.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Set Outcome
          </button>
        </form>
      </div>

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

