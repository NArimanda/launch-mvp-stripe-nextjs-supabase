'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {usePathname } from 'next/navigation';
// import { useRouter, usePathname } from 'next/navigation';

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',  // Add landing page
  '/login', 
  '/signup', 
  '/verify-email', 
  '/reset-password', 
  '/update-password'
];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  // const router = useRouter();
  const pathname = usePathname();

  console.log('[ProtectedRoute] Component rendering', {
    pathname,
    hasUser: !!user,
    isLoading,
    userEmail: user?.email,
    userId: user?.id,
    isPublicRoute: PUBLIC_ROUTES.includes(pathname),
  });

  useEffect(() => {
    console.log('[ProtectedRoute] useEffect running', {
      pathname,
      hasUser: !!user,
      isLoading,
      userEmail: user?.email,
      userId: user?.id,
      isPublicRoute: PUBLIC_ROUTES.includes(pathname),
    });

    if (!isLoading && !user && !PUBLIC_ROUTES.includes(pathname)) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      console.log('[ProtectedRoute] REDIRECTING TO LOGIN', {
        pathname,
        redirectUrl,
        reason: 'No user and not a public route',
      });
      window.location.assign(redirectUrl);
    }
  }, [user, isLoading, pathname]);

  // Show loading state only if actually loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col space-y-4 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <div>Loading at lightspeed ⚡️</div>
      </div>
    );
  }

  // Only render children if we're on a public route or user is authenticated
  if (PUBLIC_ROUTES.includes(pathname) || user) {
    return <>{children}</>;
  }

  return null;
} 