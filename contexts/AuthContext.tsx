'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Session, 
  User, 
  SupabaseClient
} from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  supabase: SupabaseClient;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
  }>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ 
    data: { user: User | null } | null; 
    error: Error | null;
  }>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      console.log('[AuthContext] initializeAuth - Starting authentication initialization');
      try {
        setIsLoading(true);
        console.log('[AuthContext] initializeAuth - Set isLoading to true');

        // First, get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[AuthContext] initializeAuth - getSession result', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          sessionExpiresAt: session?.expires_at,
          error: error ? {
            message: error.message,
            status: error.status,
          } : null,
        });
        
        if (error || !mounted) {
          console.log('[AuthContext] initializeAuth - Early return', {
            hasError: !!error,
            error: error?.message,
            mounted,
          });
          setIsLoading(false);
          return;
        }

        // Update initial state
        console.log('[AuthContext] initializeAuth - Setting session and user state', {
          hasSession: !!session,
          hasUser: !!session?.user,
        });
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Then set up listener for future changes
        console.log('[AuthContext] initializeAuth - Setting up auth state change listener');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('[AuthContext] Auth state changed', {
              event,
              hasSession: !!newSession,
              hasUser: !!newSession?.user,
              userEmail: newSession?.user?.email,
              mounted,
            });
            
            if (!mounted) {
              console.log('[AuthContext] Auth state change ignored - component not mounted');
              return;
            }
            
            const newUser = newSession?.user ?? null;
            console.log('[AuthContext] Auth state change - Updating session and user', {
              hasUser: !!newUser,
            });
            setSession(newSession);
            setUser(newUser);
          }
        );

        // Only set loading to false after everything is initialized
        if (mounted) {
          console.log('[AuthContext] initializeAuth - Initialization complete, setting isLoading to false');
          setIsLoading(false);
        }
        
        return () => {
          console.log('[AuthContext] initializeAuth - Cleanup function called');
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('[AuthContext] initializeAuth - Auth initialization error:', error);
        console.error('[AuthContext] initializeAuth - Error details:', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
        });
        if (mounted) {
          console.log('[AuthContext] initializeAuth - Error occurred, setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  const value = {
    user,
    session,
    isLoading,
    supabase,
    signInWithGoogle: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
    },
    signInWithEmail: async (email: string, password: string) => {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;

      // Check if user was previously soft-deleted
      const { data: profile } = await supabase
        .from('users')
        .select('is_deleted, deleted_at')
        .eq('id', authData.user?.id)
        .single();

      if (profile?.is_deleted) {
        // Reactivate the account
        await supabase
          .from('users')
          .update({ 
            is_deleted: false, 
            deleted_at: null,
            reactivated_at: new Date().toISOString() 
          })
          .eq('id', authData.user?.id);

        // You could trigger a welcome back notification here
      }

      return authData;
    },
    signOut: async () => {
      try {
        // First cleanup all active connections/states
        window.dispatchEvent(new Event('cleanup-before-logout'));
        
        // Wait a small amount of time for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then perform the actual signout
        await supabase.auth.signOut();
        
        // Force redirect to login
        window.location.assign('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    signUpWithEmail: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      return { data, error };
    },
    updatePassword: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
    },
    updateEmail: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
    },
    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      });
      if (error) throw error;
    },
    deleteAccount: async () => {
      // First delete user data from any related tables
      const { error: dataError } = await supabase
        .from('users')
        .delete()
        .eq('id', user?.id);
      
      if (dataError) throw dataError;

      // Finally delete the user's auth account
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user?.id as string
      );

      if (authError) throw authError;

      // Sign out after successful deletion
      await supabase.auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 