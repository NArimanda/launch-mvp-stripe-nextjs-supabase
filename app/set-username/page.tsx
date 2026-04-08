'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { setUsernameAction } from '@/app/actions/usernameActions';

export default function SetUsernamePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [usernameInput, setUsernameInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [formState, formAction, isSettingUsername] = useActionState(setUsernameAction, null);

  const normalizedPreview = useMemo(() => usernameInput.trim().toLowerCase(), [usernameInput]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setCheckingExisting(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!error && data?.username) {
          router.replace('/dashboard');
        }
      } finally {
        setCheckingExisting(false);
      }
    };

    void run();
  }, [user?.id, router]);

  useEffect(() => {
    if (hasSubmitted && formState === null && !isSettingUsername) {
      router.replace('/dashboard');
    }
  }, [hasSubmitted, formState, isSettingUsername, router]);

  if (isLoading || checkingExisting) {
    return (
      <div className="min-h-screen flex flex-col space-y-4 items-center justify-center bg-cinema-page">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <div className="text-cinema-text">Loading at lightspeed ⚡️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-page">
      <div className="min-h-screen flex mt-20 justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-cinema-card rounded-xl shadow-cinema-card border border-cinema-border">
            <div className="p-6 border-b border-cinema-border">
              <h1 className="text-2xl font-bold text-cinema-text">Choose a username</h1>
              <p className="text-cinema-textMuted mt-2">
                This will be your public handle and dashboard URL.
              </p>
            </div>

            <div className="p-6">
              <form
                action={(fd) => {
                  setHasSubmitted(true);
                  return formAction(fd);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-cinema-text mb-2" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. boxofficebandit"
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-lg bg-cinema-cardHighlight border border-cinema-border text-cinema-text placeholder:text-cinema-textMuted focus:outline-none focus:ring-2 focus:ring-primary/60"
                    disabled={isSettingUsername}
                  />
                  {normalizedPreview.length > 0 && (
                    <p className="text-xs text-cinema-textMuted mt-2">
                      Preview: <span className="font-mono">/{normalizedPreview}/dashboard</span>
                    </p>
                  )}
                </div>

                {formState && (
                  <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
                    {formState}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSettingUsername}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {isSettingUsername ? 'Saving...' : 'Save username'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-cinema-textMuted mt-4">
            Usernames must be 3–20 characters and can contain letters, numbers, and underscores.
          </p>
        </div>
      </div>
    </div>
  );
}

