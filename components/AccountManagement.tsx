import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export function AccountManagement() {
  const { user, deleteAccount } = useAuth();
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Check if user signed in with OAuth
  const isOAuthUser = user?.app_metadata?.provider === 'google';

  // Fetch admin status
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        setLoadingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin === true);
        }
      } catch (err) {
        console.error('Error fetching admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAdminStatus();
  }, [user?.id]);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await deleteAccount();
      // deleteAccount will handle signOut internally
      router.push('/login');
    } catch (error) {
      console.error('Delete account error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-cinema-card border border-cinema-border rounded-lg shadow-cinema-card p-6 mb-8">
      <h2 className="text-xl font-semibold text-cinema-text mb-4">Account Management</h2>
      
      <div className="mb-6 space-y-2 text-cinema-text">
        <p><span className="font-medium">Email:</span> {user?.email}</p>
        <p><span className="font-medium">Last Sign In:</span> {new Date(user?.last_sign_in_at || '').toLocaleString()}</p>
        <p><span className="font-medium">Account Type:</span> {isOAuthUser ? 'Google Account' : 'Email Account'}</p>
        <p>
          <span className="font-medium">Admin Status:</span>{' '}
          {loadingAdmin ? (
            <span className="text-cinema-textMuted">Loading...</span>
          ) : (
            <span className={isAdmin ? 'text-green-400 font-semibold' : 'text-cinema-textMuted'}>
              {isAdmin ? 'True' : 'False'}
            </span>
          )}
        </p>
      </div>
      
      <div className="space-y-2">
        {!isOAuthUser && (
          <button
            onClick={() => router.push(`/reset-password?email=${encodeURIComponent(user?.email || '')}`)}
            className="block w-full text-left px-4 py-2 bg-cinema-cardHighlight border border-cinema-border text-cinema-text rounded-lg hover:bg-cinema-border"
          >
            Reset Password
          </button>
        )}

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full text-left px-4 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 border border-cinema-border"
        >
          Delete Account
        </button>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-cinema-card border border-cinema-border rounded-lg p-6 max-w-md w-full shadow-cinema-card">
            <h3 className="text-xl font-semibold text-cinema-text mb-4">Delete Account?</h3>
            <p className="text-cinema-textMuted mb-6">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            {error && (
              <p className="text-red-500 mb-4">{error}</p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-cinema-textMuted hover:text-cinema-text"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 