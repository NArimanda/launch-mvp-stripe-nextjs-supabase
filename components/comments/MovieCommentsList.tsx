'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { MessageSquare, Reply, Quote } from 'lucide-react';

interface Comment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  username?: string;
}

interface MovieCommentsListProps {
  movieId: string;
  mode?: 'public' | 'admin';
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
  depth = 0 
}: { 
  comment: Comment; 
  replies: Comment[]; 
  depth?: number;
}) {
  const indentAmount = Math.min(depth * 4, 16);
  const indentClass = depth > 0 ? `ml-${indentAmount}` : '';
  
  return (
    <div className={`${depth > 0 ? 'mt-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4' : ''}`}>
      <div className="bg-white dark:bg-neutral-dark rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              {comment.username || 'Anonymous'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(comment.created_at)}
            </span>
          </div>
        </div>
        
        <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
          {comment.body}
        </p>
        
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={() => {
              // Non-functional for now
              console.log('Reply to comment:', comment.id);
            }}
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          <button
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={() => {
              // Non-functional for now
              console.log('Quote comment:', comment.id);
            }}
          >
            <Quote className="h-4 w-4" />
            Quote
          </button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MovieCommentsList({ movieId, mode = 'public' }: MovieCommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to use v_movie_comments view first, fallback to joining tables
        let query = supabase
          .from('v_movie_comments')
          .select('*')
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
              username: user?.username || null
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
            username: c.username || null
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

  const threadedComments = buildThreads(comments);

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
            />
          ))}
        </div>
      )}
    </div>
  );
}

