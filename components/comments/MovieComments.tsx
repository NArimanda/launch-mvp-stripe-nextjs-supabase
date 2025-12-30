'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import MovieCommentsList from './MovieCommentsList';
import { X, Send, AlertCircle } from 'lucide-react';

interface PendingComment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  username?: string;
  isPending: true;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
}

interface MovieCommentsProps {
  movieId: string;
}

export default function MovieComments({ movieId }: MovieCommentsProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Get current user session and admin status
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Fetch username and admin status
        const { data } = await supabase
          .from('users')
          .select('username, is_admin')
          .eq('id', session.user.id)
          .single();
        if (data) {
          if (data.username) {
            setUsername(data.username);
          } else {
            setShowUsernameModal(true);
          }
          setIsAdmin(data.is_admin === true);
        }
      }
    };
    getSession();
  }, []);

  const validateUsername = (value: string): string => {
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be at most 20 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
  };

  const handleSetUsername = async () => {
    const trimmed = usernameInput.trim();
    const error = validateUsername(trimmed);
    
    if (error) {
      setUsernameError(error);
      return;
    }

    if (!user) return;

    setIsSettingUsername(true);
    setUsernameError('');

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: trimmed,
          username_set_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505' || updateError.message.includes('unique')) {
          setUsernameError('This username is already taken');
        } else {
          setUsernameError(updateError.message || 'Failed to set username');
        }
        setIsSettingUsername(false);
        return;
      }

      setUsername(trimmed);
      setShowUsernameModal(false);
      setUsernameInput('');
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Failed to set username');
    } finally {
      setIsSettingUsername(false);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToId(commentId);
    // Scroll to comment composer
    document.getElementById('comment-composer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };


  const handleSubmitComment = async () => {
    if (!user || !username) return;
    if (!commentBody.trim()) return;

    setIsSubmitting(true);

    try {
      // Fetch markets for this movie
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, type')
        .eq('movie_id', movieId);

      if (marketsError) {
        console.error('Error fetching markets:', marketsError);
      }

      let positionMarketType: string | null = null;
      let positionSelectedRange: string | null = null;
      let positionPoints: number | null = null;

      // If markets exist, fetch user's most recent bet
      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map(m => m.id);
        const marketTypeMap = new Map(marketsData.map(m => [m.id, m.type]));

        const { data: betData, error: betError } = await supabase
          .from('bets')
          .select('market_id, selected_range, points, placed_at')
          .eq('user_id', user.id)
          .in('market_id', marketIds)
          .order('placed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (betError) {
          console.error('Error fetching user bet:', betError);
        } else if (betData) {
          positionMarketType = marketTypeMap.get(betData.market_id) || null;
          positionSelectedRange = betData.selected_range;
          positionPoints = betData.points;
        }
      }

      // Insert comment via API route
      const response = await fetch('/api/comments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user.id, // Pass user ID from client
          movie_id: movieId,
          parent_id: replyToId,
          body: commentBody.trim(),
          position_market_type: positionMarketType,
          position_selected_range: positionSelectedRange,
          position_points: positionPoints
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error submitting comment:', result.error);
        alert(`Failed to submit comment: ${result.error || 'Please try again.'}`);
        setIsSubmitting(false);
        return;
      }

      const data = result.data;

      // Add to pending comments optimistically
      const pendingComment: PendingComment = {
        id: data.id,
        movie_id: data.movie_id,
        user_id: data.user_id,
        parent_id: data.parent_id,
        body: data.body,
        approved: false,
        created_at: data.created_at,
        username: username,
        isPending: true,
        position_market_type: positionMarketType,
        position_selected_range: positionSelectedRange,
        position_points: positionPoints
      };

      setPendingComments(prev => [...prev, pendingComment]);

      // Reset form
      setCommentBody('');
      setReplyToId(null);
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuoteReferences = (text: string) => {
    const parts = text.split(/(>>[a-f0-9-]+)/gi);
    return parts.map((part, index) => {
      if (part.match(/^>>[a-f0-9-]+$/i)) {
        return (
          <span key={index} className="text-slate-500 dark:text-slate-400 italic font-mono text-sm">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };


  return (
    <div className="mt-8">
      {/* Username Onboarding Modal */}
      {showUsernameModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Set Your Username
              </h2>
              <button
                onClick={() => {
                  // Don't allow closing if username is required
                  if (!username) return;
                  setShowUsernameModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={!username}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Choose a username to start commenting. This will be displayed with your comments.
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setUsernameError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSettingUsername) {
                    handleSetUsername();
                  }
                }}
                placeholder="username"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {usernameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {usernameError}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
            <button
              onClick={handleSetUsername}
              disabled={isSettingUsername || !usernameInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSettingUsername ? 'Setting...' : 'Set Username'}
            </button>
          </div>
        </div>
      )}

      {/* Comment Composer */}
      <div id="comment-composer" className="mb-6">
        {!user ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Sign in
              </button>
              {' '}to comment
            </p>
          </div>
        ) : !username ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              Please set your username to comment
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            {replyToId && (
              <div className="mb-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded p-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Replying to comment
                </span>
                <button
                  onClick={() => setReplyToId(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={replyToId ? "Write your reply..." : "Write a comment..."}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comments require approval before being displayed
              </p>
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !commentBody.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending Comments Notice */}
      {pendingComments.length > 0 && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            You have {pendingComments.length} comment{pendingComments.length > 1 ? 's' : ''} pending approval
          </p>
        </div>
      )}

      {/* Comments List */}
      <MovieCommentsList 
        movieId={movieId} 
        mode={isAdmin ? 'admin' : 'public'}
        pendingComments={pendingComments}
        onReply={handleReply}
        renderQuoteReferences={renderQuoteReferences}
        isAdmin={isAdmin}
      />
    </div>
  );
}

