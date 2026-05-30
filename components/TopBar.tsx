'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BalanceTracker from '@/contexts/BalanceTracker';
import { supabase } from '@/utils/supabase';

const navLinkClass =
  'inline-flex min-h-11 items-center justify-center px-5 py-2 text-base font-medium rounded-full transition-colors';

export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [netBalance, setNetBalance] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAdminStatus() {
      if (!user?.id) {
        setIsAdmin(null);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Error fetching admin status:', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data?.is_admin === true);
    }

    fetchAdminStatus();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function calculateNetBalance() {
      if (!user?.id) {
        setNetBalance(null);
        setWalletBalance(null);
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);

        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
          if (!cancelled) {
            setNetBalance(null);
            setWalletBalance(null);
            setIsLoadingBalance(false);
          }
          return;
        }

        const balance = wallet?.balance ?? 0;
        if (!cancelled) setWalletBalance(balance);

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

        const lockedPoints = (lockedRows ?? []).reduce((sum, r) => sum + Number(r.points || 0), 0);
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

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuOpen &&
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsDropdownOpen(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const showRestoreBalance =
    user && !isLoadingBalance && netBalance !== null && netBalance < 500;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div ref={headerRef} className="w-full bg-cinema-card border-b border-cinema-border">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-3 px-4 py-3 md:py-5">
        <Link
          href="/"
          className="text-cinema-text flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/man-on-phone.svg"
            alt="BoxOfficeCalls"
            width={44}
            height={40}
            className="h-9 w-auto object-contain md:h-10"
          />
          <span className="hidden sm:inline text-lg md:text-[20px] font-bold">BoxOfficeCalls</span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          <Link
            href="/about"
            className={`${navLinkClass} text-cinema-text border border-cinema-border hover:bg-cinema-cardHighlight`}
          >
            About
          </Link>
          <Link
            href="/posts"
            className={`${navLinkClass} text-cinema-text border border-cinema-border hover:bg-cinema-cardHighlight`}
          >
            Posts
          </Link>
          {user && isAdmin === true ? (
            <Link
              href="/admin/movies/new"
              className={`${navLinkClass} text-white bg-primary hover:bg-primary-dark shadow-subtle hover:shadow-hover`}
            >
              Add movie
            </Link>
          ) : null}
          {!user ? (
            <Link
              href="/login"
              className={`${navLinkClass} text-white bg-primary hover:bg-primary-dark shadow-subtle hover:shadow-hover`}
            >
              Sign in
            </Link>
          ) : (
            <>
              {showRestoreBalance ? (
                <Link
                  href="/dashboard"
                  className={`${navLinkClass} bg-green-600 hover:bg-green-700 text-white shadow-subtle hover:shadow-hover text-sm lg:text-base px-4 lg:px-5`}
                >
                  restore balance to 500
                </Link>
              ) : null}
              {pathname !== '/dashboard' ? (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className={`${navLinkClass} bg-primary hover:bg-primary-dark text-white shadow-subtle hover:shadow-hover`}
                >
                  Dashboard
                </button>
              ) : null}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 hover:bg-cinema-cardHighlight px-3 py-1.5 rounded-full transition-colors min-h-11"
                >
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary text-lg font-medium shrink-0">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <BalanceTracker
                    value={netBalance}
                    loading={isLoadingBalance}
                    compact={false}
                    walletBalance={walletBalance}
                  />
                </button>

                {isDropdownOpen ? (
                  <div className="absolute right-0 mt-2 w-52 bg-cinema-card rounded-lg shadow-cinema-card py-1 z-[60] border border-cinema-border">
                    <Link
                      href="/profile"
                      className="block px-4 py-2.5 text-[13px] font-normal text-cinema-text hover:bg-cinema-cardHighlight"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-4 py-2.5 text-[13px] font-normal text-danger hover:bg-cinema-cardHighlight disabled:opacity-50"
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Mobile: compact auth + menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 hover:bg-cinema-cardHighlight px-2 py-1 rounded-full transition-colors min-h-11"
              aria-label="Account menu"
            >
              <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary text-base font-medium shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <BalanceTracker
                value={netBalance}
                loading={isLoadingBalance}
                compact
                walletBalance={walletBalance}
              />
            </button>
          ) : (
            <Link
              href="/login"
              className={`${navLinkClass} text-sm px-4 text-white bg-primary hover:bg-primary-dark`}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              setMobileMenuOpen((open) => !open);
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-cinema-border text-cinema-text hover:bg-cinema-cardHighlight transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown for account (avatar tap) */}
      {user && isDropdownOpen ? (
        <div className="md:hidden border-t border-cinema-border px-4 py-2 z-[60] bg-cinema-card">
          <Link
            href="/profile"
            className="block px-2 py-3 text-sm text-cinema-text hover:bg-cinema-cardHighlight rounded-lg"
            onClick={() => setIsDropdownOpen(false)}
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="block w-full text-left px-2 py-3 text-sm text-danger hover:bg-cinema-cardHighlight rounded-lg disabled:opacity-50"
          >
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      ) : null}

      {/* Mobile nav panel */}
      {mobileMenuOpen ? (
        <nav className="md:hidden border-t border-cinema-border px-4 py-3 space-y-1 bg-cinema-card">
          <Link
            href="/about"
            onClick={closeMobileMenu}
            className="block min-h-11 px-3 py-2.5 text-base font-medium text-cinema-text rounded-lg hover:bg-cinema-cardHighlight"
          >
            About
          </Link>
          <Link
            href="/posts"
            onClick={closeMobileMenu}
            className="block min-h-11 px-3 py-2.5 text-base font-medium text-cinema-text rounded-lg hover:bg-cinema-cardHighlight"
          >
            Posts
          </Link>
          {user && isAdmin === true ? (
            <Link
              href="/admin/movies/new"
              onClick={closeMobileMenu}
              className="block min-h-11 px-3 py-2.5 text-base font-medium text-primary rounded-lg hover:bg-cinema-cardHighlight"
            >
              Add movie
            </Link>
          ) : null}
          {user && pathname !== '/dashboard' ? (
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                router.push('/dashboard');
              }}
              className="block w-full text-left min-h-11 px-3 py-2.5 text-base font-medium text-cinema-text rounded-lg hover:bg-cinema-cardHighlight"
            >
              Dashboard
            </button>
          ) : null}
          {showRestoreBalance ? (
            <Link
              href="/dashboard"
              onClick={closeMobileMenu}
              className="block min-h-11 px-3 py-2.5 text-base font-medium text-green-400 rounded-lg hover:bg-cinema-cardHighlight"
            >
              Restore balance to 500
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
