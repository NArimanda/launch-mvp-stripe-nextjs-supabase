'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {usePathname } from 'next/navigation';
import { debugLog } from '@/utils/debugLog';
// import { useRouter, usePathname } from 'next/navigation';

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',  // Add landing page
  '/login',
  '/signup',
  '/verify-email',
  '/reset-password',
  '/update-password',
  '/about',
  '/terms',
  '/privacypolicy',
  '/contact',
  '/posts',
];

function isPublicPathname(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (pathname.startsWith('/posts/')) return true;
  return false;
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  // const router = useRouter();
  const pathname = usePathname();

  debugLog('[ProtectedRoute] Component rendering', {
    pathname,
    hasUser: !!user,
    isLoading,
    userEmail: user?.email,
    userId: user?.id,
    isPublicRoute: isPublicPathname(pathname),
  });

  useEffect(() => {
    debugLog('[ProtectedRoute] useEffect running', {
      pathname,
      hasUser: !!user,
      isLoading,
      userEmail: user?.email,
      userId: user?.id,
      isPublicRoute: isPublicPathname(pathname),
    });

    if (!isLoading && !user && !isPublicPathname(pathname)) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      debugLog('[ProtectedRoute] REDIRECTING TO LOGIN', {
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
  if (isPublicPathname(pathname) || user) {
    return <>{children}</>;
  }

  return null;
} 