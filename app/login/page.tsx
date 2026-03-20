'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { supabase } from '@/utils/supabase';
import { debugLog } from '@/utils/debugLog';

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientUserId, setClientUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check client-side user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setClientUserId(user?.id || null);
      debugLog('[LoginPage] Client user ID:', user?.id);
      if (user) {
        debugLog('[LoginPage] User detected, redirecting to dashboard');
        router.replace('/dashboard');
      }
    });
  }, [router]);

  useEffect(() => {
    if (user) {
      debugLog('[LoginPage] AuthContext user detected, redirecting to dashboard');
      router.replace('/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  const handleSubmit = async (email: string, password: string, isSignUp: boolean) => {
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) throw error;
        
        // Check if the user needs to verify their email
        if (data?.user && !data.user.email_confirmed_at) {
          router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        
        // Wait a moment for cookies to be set, then redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        debugLog('[LoginPage] Sign up successful, redirecting to dashboard');
        router.replace('/dashboard');
      } else {
        await signInWithEmail(email, password);
        // Wait a moment for cookies to be set, then redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        debugLog('[LoginPage] Sign in successful, redirecting to dashboard');
        router.replace('/dashboard');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cinema-page">
        <div className="text-cinema-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-page">
      {clientUserId && (
        <div className="bg-cinema-card border-b border-cinema-border p-2 text-xs text-cinema-textMuted">
          Client User ID: {clientUserId}
        </div>
      )}
      <div className="min-h-screen flex mt-20 justify-center px-4">
        <div className="w-full max-w-md">
          {/* <h1 className="text-4xl font-bold text-center mb-8 text-primary dark:text-white">
            NextTemp
          </h1> */}
          <LoginForm
            onSubmit={handleSubmit}
            onGoogleSignIn={signInWithGoogle}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
} 