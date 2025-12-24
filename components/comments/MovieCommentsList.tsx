'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { MessageSquare, Reply, Quote, Check, Trash2 } from 'lucide-react';
import { approveCommentAction, deleteCommentAction } from '@/app/api/comments/actions';

interface Comment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  username?: string;
  isPending?: boolean;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
}

interface MovieCommentsListProps {
  movieId: string;
  mode?: 'public' | 'admin';
  pendingComments?: Comment[];
  onReply?: (commentId: string) => void;
  onQuote?: (commentId: string) => void;
  renderQuoteReferences?: (text: string) => React.ReactNode;
  isAdmin?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function CommentCard({ 
  comment, 
  replies, 
  depth = 0,
  onReply,
  onQuote,
  renderQuoteReferences,
  isAdmin = false,
  onRefresh
}: { 
  comment: Comment; 
  replies: Comment[]; 
  depth?: number;
  onReply?: (commentId: string) => void;
  onQuote?: (commentId: string) => void;
  renderQuoteReferences?: (text: string) => React.ReactNode;
  isAdmin?: boolean;
  onRefresh?: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async () => {
    setActionLoading('approve');
    const result = await approveCommentAction(comment.id);
    if (result.error) {
      alert(`Failed to approve comment: ${result.error}`);
    } else {
      onRefresh?.();
    }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    setActionLoading('delete');
    const result = await deleteCommentAction(comment.id);
    if (result.error) {
      alert(`Failed to delete comment: ${result.error}`);
    } else {
      onRefresh?.();
    }
    setActionLoading(null);
  };
  return (
    <div className={`${depth > 0 ? 'mt-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''}`}>
      <div className={`bg-white dark:bg-neutral-dark rounded-lg p-4 shadow-sm border ${
        comment.isPending 
          ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' 
          : 'border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              {comment.username || 'Anonymous'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(comment.created_at)}
            </span>
            {comment.isPending && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                Pending approval
              </span>
            )}
          </div>
        </div>
        
        <div className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
          {renderQuoteReferences ? renderQuoteReferences(comment.body) : comment.body}
        </div>
        
        {/* Position Snapshot Display */}
        {comment.position_market_type && comment.position_selected_range && typeof comment.position_points === 'number' && (
          <div className="mb-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 inline-block">
            Position: <span className="font-medium capitalize">{comment.position_market_type}</span> | <span className="font-medium">{comment.position_selected_range}</span> | <span className="font-medium">{comment.position_points.toLocaleString()}</span> pts
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {!comment.isPending && (
            <>
              {onReply && (
                <button
                  className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => onReply(comment.id)}
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
              )}
              {onQuote && (
                <button
                  className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => onQuote(comment.id)}
                >
                  <Quote className="h-4 w-4" />
                  Quote
                </button>
              )}
            </>
          )}
          {isAdmin && (
            <>
              {comment.isPending || !comment.approved ? (
                <button
                  onClick={handleApprove}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === 'approve' ? (
                    'Approving...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Approve
                    </>
                  )}
                </button>
              ) : null}
              <button
                onClick={handleDelete}
                disabled={actionLoading !== null}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'delete' ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Render nested replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              replies={[]}
              depth={depth + 1}
              onReply={onReply}
              onQuote={onQuote}
              renderQuoteReferences={renderQuoteReferences}
              isAdmin={isAdmin}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MovieCommentsList({ 
  movieId, 
  mode = 'public',
  pendingComments = [],
  onReply,
  onQuote,
  renderQuoteReferences,
  isAdmin = false
}: MovieCommentsListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    router.refresh();
  };

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        setLoading(true);
        setError(null);

        // Try to use v_movie_comments view first, fallback to joining tables
        let query = supabase
          .from('v_movie_comments')
          .select('id, movie_id, user_id, parent_id, body, approved, created_at, username, position_market_type, position_selected_range, position_points')
          .eq('movie_id', movieId);
        
        // Add approved filter for public mode
        if (mode === 'public') {
          query = query.eq('approved', true);
        }
        
        query = query.order('created_at', { ascending: true });

        // If view doesn't exist or fails, fallback to joining movie_comments with users
        const { data: viewData, error: viewError } = await query;

        if (viewError || !viewData) {
          // Fallback: join movie_comments with users table
          let commentsQuery = supabase
            .from('movie_comments')
            .select(`
              id,
              movie_id,
              user_id,
              parent_id,
              body,
              approved,
              created_at,
              position_market_type,
              position_selected_range,
              position_points,
              users(username)
            `)
            .eq('movie_id', movieId);
          
          // Add approved filter for public mode
          if (mode === 'public') {
            commentsQuery = commentsQuery.eq('approved', true);
          }
          
          commentsQuery = commentsQuery.order('created_at', { ascending: true });

          const { data: commentsData, error: commentsError } = await commentsQuery;

          if (commentsError) {
            throw commentsError;
          }

          // Transform the data to flatten the nested structure
          const transformedComments = (commentsData || []).map((comment: any) => {
            const user = Array.isArray(comment.users) ? comment.users[0] : comment.users;
            return {
              id: comment.id,
              movie_id: comment.movie_id,
              user_id: comment.user_id,
              parent_id: comment.parent_id,
              body: comment.body,
              approved: comment.approved,
              created_at: comment.created_at,
              username: user?.username || null,
              position_market_type: comment.position_market_type || null,
              position_selected_range: comment.position_selected_range || null,
              position_points: comment.position_points || null
            };
          });

          setComments(transformedComments);
        } else {
          // Use view data
          setComments(viewData.map((c: any) => ({
            id: c.id,
            movie_id: c.movie_id,
            user_id: c.user_id,
            parent_id: c.parent_id,
            body: c.body,
            approved: c.approved,
            created_at: c.created_at,
            username: c.username || null,
            position_market_type: c.position_market_type || null,
            position_selected_range: c.position_selected_range || null,
            position_points: c.position_points || null
          })));
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchComments();
    }
  }, [movieId, mode]);

  // Build threaded structure
  const buildThreads = (comments: Comment[]): Array<Comment & { replies: Comment[] }> => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: Array<Comment & { replies: Comment[] }> = [];

    // First pass: create map of all comments with empty replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          // Orphaned reply (parent not found), treat as root
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  // Merge approved comments with pending comments (only show pending for current user)
  const allComments = [
    ...comments,
    ...(user ? pendingComments.filter(c => c.user_id === user.id) : [])
  ];

  const threadedComments = buildThreads(allComments);

  if (loading) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Comments</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-600 dark:text-slate-400">Loading comments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Comments</h2>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>
      </div>

      {threadedComments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-dark rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threadedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              replies={comment.replies}
              depth={0}
              onReply={onReply}
              onQuote={onQuote}
              renderQuoteReferences={renderQuoteReferences}
              isAdmin={isAdmin}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

