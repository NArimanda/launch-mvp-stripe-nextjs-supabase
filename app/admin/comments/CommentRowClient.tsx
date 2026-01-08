'use client';

import { useFormStatus, useFormState } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { approveComment, deleteComment, toggleBanUser } from './actions';
import { supabase } from '@/utils/supabase';
import ExpandableCommentImage from '@/components/comments/ExpandableCommentImage';

interface Comment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
  movie_title?: string | null;
  movie_slug?: string | null;
  username?: string | null;
  user_is_banned?: boolean;
  image_path?: string | null;
  image_mime?: string | null;
  image_size?: number | null;
}

interface CommentRowClientProps {
  comment: Comment;
  isPending: boolean;
}

function ApproveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Approving...' : 'Approve'}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

function DeleteForm({ commentId }: { commentId: string }) {
  const [state, formAction] = useFormState(deleteComment, null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      e.preventDefault();
      return;
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="commentId" value={commentId} />
      {state && (
        <div className="text-red-600 text-xs mb-1">{state}</div>
      )}
      <DeleteButton />
    </form>
  );
}

function BanSubmitButton({ isBanned }: { isBanned: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="ban-btn"
      className={`text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
        isBanned
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-red-600 hover:bg-red-700 text-white'
      }`}
    >
      {pending ? 'Processing...' : isBanned ? 'Unban User' : 'Ban User'}
    </button>
  );
}

function BanForm({ userId, isBanned, onSuccess, onError }: { 
  userId: string; 
  isBanned: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [state, formAction] = useFormState(toggleBanUser, null);
  const router = useRouter();
  const submittedRef = useRef(false);
  const prevStateRef = useRef<string | null>(null);

  // Track when form is actually submitted
  const handleSubmit = () => {
    submittedRef.current = true;
  };

  // Handle state changes only after submission
  useEffect(() => {
    // Only process if we've submitted and state has changed
    if (!submittedRef.current) {
      return;
    }

    // Check if state changed from previous
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;

      if (state === 'OK') {
        // Success
        onSuccess(isBanned ? 'User unbanned successfully' : 'User banned successfully');
        submittedRef.current = false; // Reset for next submission
        router.refresh();
      } else if (state && state !== 'OK') {
        // Error
        onError(state);
        submittedRef.current = false; // Reset for next submission
      }
    }
  }, [state, isBanned, onSuccess, onError, router]);

  // Safety check: don't render if userId is missing
  if (!userId) {
    return null;
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} data-testid="ban-form">
      <input type="hidden" name="userId" value={userId} />
      <BanSubmitButton isBanned={isBanned} />
    </form>
  );
}

function ApproveForm({ commentId }: { commentId: string }) {
  const [state, formAction] = useFormState(approveComment, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="commentId" value={commentId} />
      {state && (
        <div className="text-red-600 text-xs mb-1">{state}</div>
      )}
      <ApproveButton />
    </form>
  );
}

export default function CommentRowClient({
  comment,
  isPending,
}: CommentRowClientProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isBanned = comment.user_is_banned ?? false;

  // Fetch admin status for comment author and current user ID
  useEffect(() => {
    const fetchUserInfo = async () => {
      // Get current user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentUserId(authUser.id);
      }

      // Get admin status for comment author
      if (comment.user_id) {
        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', comment.user_id)
          .single();
        
        if (!error && data) {
          setUserIsAdmin(data.is_admin ?? false);
        }
      }
    };
    fetchUserInfo();
  }, [comment.user_id]);

  // Show toast and auto-hide after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Generate signed URL for comment image
  useEffect(() => {
    if (comment.image_path) {
      const generateSignedUrl = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('comment-images')
            .createSignedUrl(comment.image_path!, 3600); // 1 hour expiry

          if (error) {
            console.error('Error generating signed URL:', error);
            setImageUrl(null);
          } else if (data) {
            setImageUrl(data.signedUrl);
          }
        } catch (err) {
          console.error('Error generating signed URL:', err);
          setImageUrl(null);
        }
      };
      generateSignedUrl();
    } else {
      setImageUrl(null);
    }
  }, [comment.image_path]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white">
                {comment.movie_slug ? (
                  <a 
                    href={`/movie/${comment.movie_slug}`}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {comment.movie_title || 'Unknown Movie'}
                  </a>
                ) : (
                  comment.movie_title || 'Unknown Movie'
                )}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">•</span>
              {comment.username ? (
                <Link 
                  href={`/${comment.username}/dashboard`}
                  className={`text-sm hover:underline ${
                    userIsAdmin 
                      ? 'text-green-700 dark:text-green-400 font-semibold' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {comment.username}
                </Link>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Anonymous
                </span>
              )}
              {currentUserId && comment.user_id === currentUserId && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  (you)
                </span>
              )}
              {isBanned && (
                <>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                    BANNED
                  </span>
                </>
              )}
              <span className="text-sm text-slate-500 dark:text-slate-400">•</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {formatDate(comment.created_at)}
              </span>
              {comment.approved_at && (
                <>
                  <span className="text-sm text-slate-500 dark:text-slate-400">•</span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Approved {formatDate(comment.approved_at)}
                  </span>
                </>
              )}
            </div>
          {comment.parent_id && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Reply to comment: {comment.parent_id.substring(0, 8)}...
            </div>
          )}
          {comment.position_market_type && comment.position_selected_range && comment.position_points !== null && comment.position_points !== undefined && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1 inline-block">
              Position: <span className="font-medium capitalize">{comment.position_market_type}</span> |{' '}
              <span className="font-medium">{comment.position_selected_range}</span> |{' '}
              <span className="font-medium">{comment.position_points.toLocaleString()}</span> pts
            </div>
          )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isPending && (
              <ApproveForm commentId={comment.id} />
            )}
            <BanForm 
              userId={comment.user_id} 
              isBanned={isBanned}
              onSuccess={(message) => setToast({ message, type: 'success' })}
              onError={(message) => setToast({ message, type: 'error' })}
            />
            <DeleteForm commentId={comment.id} />
            {/* DEBUG: Canary element to verify we're in the right place */}
            <div data-testid="ban-canary" className="ml-2 px-2 py-1 bg-yellow-300 text-black text-xs rounded">
              BAN_CANARY
            </div>
            {/* DEBUG: Plain button test */}
            <button className="ml-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded">
              Ban Plain
            </button>
            {/* DEBUG: BanForm with dummy values */}
            <BanForm 
              userId="test-user-id" 
              isBanned={false}
              onSuccess={(message) => setToast({ message, type: 'success' })}
              onError={(message) => setToast({ message, type: 'error' })}
            />
          </div>
        </div>
        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
          {comment.body}
        </div>
        
        {/* Comment Image */}
        {imageUrl && (
          <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
            <ExpandableCommentImage src={imageUrl} alt="Comment attachment" />
          </div>
        )}
      </div>

    {/* Toast Notification */}
    {toast && (
      <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
        <div
          className={`px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      </div>
    )}
    </>
  );
}
