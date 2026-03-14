'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AccountManagement } from '@/components/AccountManagement';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

function ProfileContent() {
  const { user } = useAuth();
  const router = useRouter();

  // Add useEffect for auth check
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-cinema-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-cinema-card rounded-xl shadow-cinema-card border border-cinema-border">
          <div className="p-6 border-b border-cinema-border">
            <h1 className="text-2xl font-bold text-cinema-text">
              Profile
            </h1>
            <p className="text-cinema-textMuted mt-2">
              Manage your account settings and preferences
            </p>
          </div>
        
          <div className="p-6">
        <AccountManagement />
            </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-cinema-page flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-cinema-text mb-2">Something went wrong</h2>
            <p className="text-cinema-textMuted mb-4">Please try refreshing the page</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileContent />
    </Suspense>
    </ErrorBoundary>
  );
}
