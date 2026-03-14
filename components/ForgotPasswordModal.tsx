'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password#`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-cinema-card border border-cinema-border rounded-lg p-6 max-w-md w-full shadow-cinema-card">
        <h2 className="text-xl font-semibold text-cinema-text mb-4">Reset Password</h2>
        
        {success ? (
          <div className="space-y-4">
            <p className="text-green-400">
              Reset link has been sent to your email address. Please check your inbox.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cinema-textMuted">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-cinema-border bg-cinema-card text-cinema-text placeholder-cinema-textMuted shadow-sm focus:border-cinema-accent focus:ring-cinema-accent"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 text-cinema-textMuted hover:text-cinema-text"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 