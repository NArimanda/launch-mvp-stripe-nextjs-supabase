'use client';

import { useState } from 'react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import Image from 'next/image';

interface LoginFormProps {
  onSubmit: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export function LoginForm({ 
  onSubmit, 
  onGoogleSignIn, 
  isLoading, 
  error 
}: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, isSignUp);
  };

  return (
    <div className="w-full space-y-8 p-8 bg-cinema-card rounded-2xl shadow-cinema-card border border-cinema-border">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-3xl">🎬</span>
          <h2 className="text-2xl font-medium text-cinema-text">
            NextTemp
          </h2>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-center">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <button
          onClick={onGoogleSignIn}
          className="w-full py-2.5 px-4 border border-cinema-border rounded-full shadow-subtle text-cinema-text bg-cinema-card hover:bg-cinema-cardHighlight transition-all flex items-center justify-center"
        >
          <Image
            src="/Google-Logo.png"
            alt="Google Logo"
            width={20}
            height={20}
            className="mr-2"
          />
          Sign in with Google
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-cinema-border"></div>
          <span className="mx-4 text-sm text-cinema-textMuted">OR</span>
          <div className="flex-grow border-t border-cinema-border"></div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-cinema-text">
          {isSignUp ? 'Create an account' : 'Are you an Email User?'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-md shadow-sm space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-cinema-border bg-cinema-card text-cinema-text placeholder-cinema-textMuted focus:outline-none focus:ring-2 focus:ring-cinema-accent focus:border-cinema-accent transition-all"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-cinema-border bg-cinema-card text-cinema-text placeholder-cinema-textMuted focus:outline-none focus:ring-2 focus:ring-cinema-accent focus:border-cinema-accent transition-all"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsForgotPasswordOpen(true)}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Forgot your password?
          </button>
        </div>

        <ForgotPasswordModal 
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-2.5 px-4 border border-transparent rounded-full shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
        >
          {isSignUp ? 'Sign up' : 'Sign in'} with Email
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:text-primary-dark transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </form>
    </div>
  );
}