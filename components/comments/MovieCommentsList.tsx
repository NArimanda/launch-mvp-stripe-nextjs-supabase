'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { MessageSquare, Reply, Check, Trash2 } from 'lucide-react';
import { approveCommentAction, deleteCommentAction, toggleBanUserAction } from '@/app/api/comments/actions';

const MAX_REPLIES_PER_PARENT = 3;
const MAX_THREAD_DEPTH = 3;
const REPLIES_PAGE_SIZE = 3;

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
  image_path?: string | null;
  image_mime?: string | null;
  image_size?: number | null;
}

interface MovieCommentsListProps {
  movieId: string;
  mode?: 'public' | 'admin';
  pendingComments?: Comment[];
  onReply?: (commentId: string) => void;
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
  renderQuoteReferences,
  isAdmin = false,
  onRefresh
}: { 
  comment: Comment; 
  replies: Comment[]; 
  depth?: number;
  onReply?: (commentId: string) => void;
  renderQuoteReferences?: (text: string) => React.ReactNode;
  isAdmin?: boolean;
  onRefresh?: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userIsBanned, setUserIsBanned] = useState<boolean | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState<boolean | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<number>(MAX_REPLIES_PER_PARENT);
  const [expandedDepth, setExpandedDepth] = useState<boolean>(false);

  // Fetch ban status and admin status when component mounts (only if admin)
  useEffect(() => {
    if (isAdmin && comment.user_id) {
      const fetchUserStatus = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('is_banned, is_admin')
          .eq('id', comment.user_id)
          .single();
        
        if (!error && data) {
          setUserIsBanned(data.is_banned ?? false);
          setUserIsAdmin(data.is_admin ?? false);
        }
      };
      fetchUserStatus();
    }
  }, [isAdmin, comment.user_id]);

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

  const handleToggleBan = async () => {
    if (!comment.user_id) return;
    
    setActionLoading('ban');
    const result = await toggleBanUserAction(comment.user_id);
    if (result.error) {
      alert(`Failed to toggle ban: ${result.error}`);
    } else {
      // Update local state
      setUserIsBanned(prev => prev !== null ? !prev : null);
      onRefresh?.();
    }
    setActionLoading(null);
  };
  return (
    <div className={`${depth > 0 ? 'mt-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''}`}>
      <div className={`bg-white dark:bg-neutral-dark rounded-lg p-4 shadow-sm border ${
        (comment.isPending || comment.approved === false)
          ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' 
          : 'border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              {comment.username || 'Anonymous'}
            </span>
            {isAdmin && userIsBanned && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                BANNED
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(comment.created_at)}
            </span>
            {(comment.isPending || comment.approved === false) && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                Pending
              </span>
            )}
          </div>
        </div>
        
        <div className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
          {renderQuoteReferences ? renderQuoteReferences(comment.body) : comment.body}
        </div>
        
        {/* Comment Image */}
        {imageUrl && (
          <div className="mb-3">
            <img
              src={imageUrl}
              alt="Comment attachment"
              className="max-w-full max-h-96 rounded-lg border border-slate-300 dark:border-slate-600 object-contain"
              onError={() => {
                // Hide image on error
                setImageUrl(null);
              }}
            />
          </div>
        )}
        
        {/* Position Snapshot Display */}
        {comment.position_market_type && comment.position_selected_range && typeof comment.position_points === 'number' && (
          <div className="mb-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 inline-block">
            Position: <span className="font-medium capitalize">{comment.position_market_type}</span> | <span className="font-medium">{comment.position_selected_range}</span> | <span className="font-medium">{comment.position_points.toLocaleString()}</span> pts
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {comment.approved !== false && (
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
              {/* Only show ban button if comment author is not an admin */}
              {!userIsAdmin && (
                <button
                  onClick={handleToggleBan}
                  disabled={actionLoading !== null || userIsBanned === null}
                  className={`flex items-center gap-1 px-3 py-1.5 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    userIsBanned
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading === 'ban' ? (
                    'Processing...'
                  ) : (
                    userIsBanned ? 'Unban User' : 'Ban User'
                  )}
                </button>
              )}
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
        <div className="mt-2 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* If at max depth and not expanded, show collapse button */}
            {depth >= MAX_THREAD_DEPTH && !expandedDepth ? (
              <button
                onClick={() => setExpandedDepth(true)}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline mt-2"
              >
                View deeper replies ({replies.length})
              </button>
            ) : (
              <>
                {/* Render visible replies */}
                {replies.slice(0, visibleRepliesCount).map((reply) => {
                  // Type assertion: replies come from buildThreads which adds replies property
                  const replyWithReplies = reply as Comment & { replies: Comment[] };
                  return (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      replies={replyWithReplies.replies || []}
                      depth={depth + 1}
                      onReply={onReply}
                      renderQuoteReferences={renderQuoteReferences}
                      isAdmin={isAdmin}
                      onRefresh={onRefresh}
                    />
                  );
                })}
                
                {/* Show more replies button if more exist */}
                {replies.length > visibleRepliesCount && (
                  <button
                    onClick={() => setVisibleRepliesCount(prev => prev + REPLIES_PAGE_SIZE)}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline mt-2"
                  >
                    Show more replies ({replies.length - visibleRepliesCount} more)
                  </button>
                )}
              </>
            )}
          </div>
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
  renderQuoteReferences,
  isAdmin = false
}: MovieCommentsListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const commentsRef = useRef<Comment[]>([]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setNextCursor(null);
    setHasMore(false);
    commentsRef.current = [];
    router.refresh();
  };

  // Get current user ID and admin status
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentUserId(authUser.id);
        // Check if user is admin
        const { data: userProfile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', authUser.id)
          .single();
        setIsUserAdmin(userProfile?.is_admin === true);
      } else {
        setCurrentUserId(null);
        setIsUserAdmin(false);
      }
    };
    fetchUserInfo();
  }, []);

  // Initial fetch with pagination
  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        setError(null);

        // Fetch initial 5 comments (newest first) via API route
        const params = new URLSearchParams({
          movieId,
          limit: '5',
        });

        const response = await fetch(`/api/comments/page?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch comments: ${response.statusText}`);
        }

        const data = await response.json();
        const { comments: fetchedComments, nextCursor: fetchedCursor } = data;

        if (!Array.isArray(fetchedComments)) {
          throw new Error('Invalid response format');
        }

        setComments(fetchedComments);
        commentsRef.current = fetchedComments;
        setNextCursor(fetchedCursor);
        setHasMore(fetchedCursor !== null);
        
        // Debug: log user ID and pending count
        if (process.env.NODE_ENV === 'development') {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const pendingCount = fetchedComments.filter((c: Comment) => c.approved === false).length;
          console.log('[MovieCommentsList] Debug (fetched):', {
            userId: authUser?.id || null,
            pendingCount,
            totalComments: fetchedComments.length,
            hasMore: fetchedCursor !== null
          });
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
        let errorMessage = 'Failed to load comments';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          const errorObj = err as any;
          errorMessage = errorObj.message || errorObj.details || errorObj.hint || JSON.stringify(err);
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchComments();
    }
  }, [movieId, mode, refreshKey]);

  // Load more comments
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        movieId,
        limit: '5',
        cursorCreatedAt: nextCursor.created_at,
        cursorId: nextCursor.id,
      });

      const response = await fetch(`/api/comments/page?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load more comments: ${response.statusText}`);
      }

      const data = await response.json();
      const { comments: newComments, nextCursor: newCursor } = data;

      if (!Array.isArray(newComments)) {
        throw new Error('Invalid response format');
      }

      // Deduplicate comments by ID before appending
      // This prevents duplicate keys when replies are already in the existing comments
      // Use ref to get current comments synchronously
      const existingIds = new Set(commentsRef.current.map(c => c.id));
      const uniqueNewComments = newComments.filter(c => !existingIds.has(c.id));
      
      // Update comments with unique new ones
      if (uniqueNewComments.length > 0) {
        const updatedComments = [...commentsRef.current, ...uniqueNewComments];
        setComments(updatedComments);
        commentsRef.current = updatedComments;
      }
      
      // Update cursor and hasMore
      setNextCursor(newCursor);
      // Set hasMore to false if:
      // 1. No new cursor (API indicates no more comments), OR
      // 2. We got no new unique comments (all were duplicates, meaning we've seen everything)
      setHasMore(newCursor !== null && uniqueNewComments.length > 0);
    } catch (err) {
      console.error('Error loading more comments:', err);
      alert(err instanceof Error ? err.message : 'Failed to load more comments');
    } finally {
      setLoadingMore(false);
    }
  };

  // Build threaded structure
  const buildThreads = (comments: Comment[]): Array<Comment & { replies: Comment[] }> => {
    // Deduplicate comments by ID first (defensive measure)
    const uniqueComments = Array.from(
      new Map(comments.map(c => [c.id, c])).values()
    );

    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: Array<Comment & { replies: Comment[] }> = [];

    // First pass: create map of all comments with empty replies array
    uniqueComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    uniqueComments.forEach(comment => {
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

  // STEP 2: Defense-in-depth UI filtering
  // Filter comments based on user role:
  // - Non-admins: only see approved=true OR approved=false where user_id matches
  // - Admins: see everything
  const filteredComments = isUserAdmin || isAdmin
    ? comments // Admins see everything
    : comments.filter(comment => 
        comment.approved === true || comment.user_id === currentUserId
      );

  // Merge approved comments with pending comments (only show pending for current user)
  // Deduplicate by ID to avoid showing the same comment twice (optimistic + RLS)
  const commentIds = new Set(filteredComments.map(c => c.id));
  const uniquePendingComments = user 
    ? pendingComments.filter(c => c.user_id === user.id && !commentIds.has(c.id))
    : [];
  const allComments = [...filteredComments, ...uniquePendingComments];

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

  const pendingCountFetched = comments.filter(c => c.approved === false).length;
  const pendingCountFiltered = filteredComments.filter(c => c.approved === false).length;
  const showAdminBanner = (isUserAdmin || isAdmin) && pendingCountFetched > 0;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Comments {filteredComments.length > 0 && `(${filteredComments.length})`}
        </h2>
      </div>
      
      {/* Admin Mode Banner */}
      {showAdminBanner && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            Admin Mode: showing all pending comments ({pendingCountFetched} pending)
          </p>
        </div>
      )}
      
      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
          <div>User ID: {currentUserId || 'null'}</div>
          <div>Is Admin: {String(isUserAdmin || isAdmin)}</div>
          <div>Total fetched: {comments.length}</div>
          <div>Pending fetched: {pendingCountFetched}</div>
          <div>Pending after filter: {pendingCountFiltered}</div>
          <div>Total after filter: {filteredComments.length}</div>
        </div>
      )}

      {threadedComments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-dark rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {threadedComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                replies={comment.replies}
                depth={0}
                onReply={onReply}
                renderQuoteReferences={renderQuoteReferences}
                isAdmin={isAdmin}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

