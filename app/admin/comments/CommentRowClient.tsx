'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

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
}

interface CommentRowClientProps {
  comment: Comment;
  isPending: boolean;
  onApprove: (id: string) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<{ error?: string }>;
}

export default function CommentRowClient({
  comment,
  isPending,
  onApprove,
  onDelete,
}: CommentRowClientProps) {
  const router = useRouter();
  const [isPendingAction, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleApprove = () => {
    setActionLoading('approve');
    startTransition(async () => {
      const result = await onApprove(comment.id);
      if (result.error) {
        alert(`Failed to approve comment: ${result.error}`);
      }
      setActionLoading(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setActionLoading('delete');
    startTransition(async () => {
      const result = await onDelete(comment.id);
      if (result.error) {
        alert(`Failed to delete comment: ${result.error}`);
      }
      setActionLoading(null);
      router.refresh();
    });
  };

  return (
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
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {comment.username || 'Anonymous'}
            </span>
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
          {comment.position_market_type && comment.position_selected_range && comment.position_points !== null && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1 inline-block">
              Position: <span className="font-medium capitalize">{comment.position_market_type}</span> |{' '}
              <span className="font-medium">{comment.position_selected_range}</span> |{' '}
              <span className="font-medium">{comment.position_points.toLocaleString()}</span> pts
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {isPending && (
            <button
              onClick={handleApprove}
              disabled={isPendingAction || actionLoading !== null}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPendingAction || actionLoading !== null}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
      <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
        {comment.body}
      </div>
    </div>
  );
}

