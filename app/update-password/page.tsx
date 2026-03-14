'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have a valid hash in the URL (indicates password reset flow)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ error }) => {
          if (error) {
            setError('Failed to set session');
          }
        });
      } else {
        setError('Invalid recovery link');
      }
    } else {
      setError('Auth session missing!');
    }
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setSuccess(true);
      // Redirect to login after successful password update
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cinema-page flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-cinema-text">Update Password</h2>
          <p className="mt-2 text-cinema-textMuted">
            Please enter your new password
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-cinema-border text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-900/30 border border-cinema-border text-green-400 p-4 rounded-lg">
            Password updated successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="sr-only">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-cinema-border bg-cinema-card text-cinema-text placeholder-cinema-textMuted focus:outline-none focus:ring-2 focus:ring-cinema-accent focus:border-cinema-accent sm:text-sm"
                  placeholder="New Password"
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-cinema-border bg-cinema-card text-cinema-text placeholder-cinema-textMuted focus:outline-none focus:ring-2 focus:ring-cinema-accent focus:border-cinema-accent sm:text-sm"
                  placeholder="Confirm Password"
                  minLength={6}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 