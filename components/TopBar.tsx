'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BalanceTracker from '@/contexts/BalanceTracker';
import { supabase } from '@/utils/supabase';

// TopBar component handles user profile display and navigation
export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [netBalance, setNetBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  // State for tracking logout process
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoadingAdmin(false);
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
      } finally {
        setIsLoadingAdmin(false);
      }
    };

    checkAdmin();
  }, [user?.id]);

  // Calculate net balance (wallet balance + locked bet points)
  useEffect(() => {
    let cancelled = false;
    
    async function calculateNetBalance() {
      if (!user?.id) {
        setNetBalance(null);
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);
        
        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
          if (!cancelled) {
            setNetBalance(null);
            setIsLoadingBalance(false);
          }
          return;
        }

        const balance = wallet?.balance ?? 0;

        // Fetch locked bets (bets with outcome NULL or 'pending' in markets with status 'open' or 'locked')
        const { data: lockedRows, error: lockedErr } = await supabase
          .from('bets')
          .select('points, markets!inner(status)')
          .eq('user_id', user.id)
          .in('markets.status', ['open', 'locked'])
          .or('outcome.is.null,outcome.eq.pending');

        if (lockedErr) {
          console.error('Error fetching locked bets:', lockedErr);
          if (!cancelled) {
            setNetBalance(null);
            setIsLoadingBalance(false);
          }
          return;
        }

        // Sum locked points
        const lockedPoints = (lockedRows ?? []).reduce((sum, r) => sum + Number(r.points || 0), 0);

        // Calculate net balance
        const calculatedNetBalance = Number(balance) + lockedPoints;

        if (!cancelled) {
          setNetBalance(calculatedNetBalance);
          setIsLoadingBalance(false);
        }
      } catch (error) {
        console.error('Error calculating net balance:', error);
        if (!cancelled) {
          setNetBalance(null);
          setIsLoadingBalance(false);
        }
      }
    }

    calculateNetBalance();
    
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user logout with error handling and loading state
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsDropdownOpen(false);
      setIsLoggingOut(false);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="w-full bg-cinema-card border-b border-cinema-border">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-5">
        <Link href="/" className="text-lg sm:text-xl font-medium text-cinema-text flex items-center gap-2.5 hover:opacity-80 transition-opacity my-0">
          <Image src="/man-on-phone.svg" alt="BoxOfficeCalls" width={44} height={40} className="h-10 w-auto object-contain" />
          <span className="font-sans">BoxOfficeCalls</span>
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link
                href="/login"
                className="px-5 py-1.5 text-base font-medium text-white bg-primary hover:bg-primary-dark rounded-full transition-colors shadow-subtle hover:shadow-hover"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {user && !isLoadingBalance && netBalance !== null && netBalance < 500 && (
                  <Link
                    href="/dashboard"
                    className="hidden sm:block px-5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-full text-base font-medium transition-colors shadow-subtle hover:shadow-hover"
                  >
                    restore balance to 500
                  </Link>
                )}
                {pathname !== '/dashboard' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="hidden sm:block px-5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-full text-base font-medium transition-colors shadow-subtle hover:shadow-hover"
                  >
                    Dashboard
                  </button>
                )}
              </div>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 hover:bg-cinema-cardHighlight px-4 py-1.5 rounded-full transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary text-lg font-medium">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <BalanceTracker value={netBalance} loading={isLoadingBalance} compact={false} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-cinema-card rounded-lg shadow-cinema-card py-1 z-[60] border border-cinema-border">
                    <Link
                      href="/profile"
                      className="block px-4 py-1.5 text-base text-cinema-text hover:bg-cinema-cardHighlight"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsDropdownOpen(false);
                        window.location.href = '/profile';
                      }}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-4 py-1.5 text-base text-danger hover:bg-cinema-cardHighlight disabled:opacity-50"
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 