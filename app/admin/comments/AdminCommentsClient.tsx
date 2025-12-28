'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2, Loader2 } from 'lucide-react';
import { approveComment, deleteComment } from './actions';
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
  username?: string | null;
  movie_title?: string | null;
  movie_slug?: string | null;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
}

interface AdminCommentsClientProps {
  pendingComments: Comment[];
  approvedComments: Comment[];
  debugInfo: {
    authUserId: string;
    isAdmin: boolean;
    totalComments: number;
    pendingCount: number;
    approvedCount: number;
  };
}

export default function AdminCommentsClient({
  pendingComments,
  approvedComments,
  debugInfo
}: AdminCommentsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (commentId: string) => {
    setActionLoading(commentId);
    startTransition(async () => {
      const result = await approveComment(commentId);
      alert(JSON.stringify(result));
      if (result.error) {
        alert(`Failed to approve comment: ${result.error}`);
      }
      setActionLoading(null);
      router.refresh();
    });
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setActionLoading(commentId);
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.error) {
        alert(`Failed to delete comment: ${result.error}`);
      }
      setActionLoading(null);
      router.refresh();
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Comment Moderation</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage and moderate movie comments</p>
      </div>

      {/* Debug Panel */}
      <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Debug Information</h2>
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-mono">
          <p>Auth User ID: {debugInfo.authUserId}</p>
          <p>Is Admin: {debugInfo.isAdmin ? 'true' : 'false'}</p>
          <p>Total Comments: {debugInfo.totalComments}</p>
          <p>Pending Count: {debugInfo.pendingCount}</p>
          <p>Approved Count: {debugInfo.approvedCount}</p>
        </div>
      </div>

      {/* Pending Comments Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Pending Comments ({pendingComments.length})
        </h2>
        {pendingComments.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No pending comments</p>
        ) : (
          <div className="space-y-4">
            {pendingComments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {comment.username || 'Anonymous'}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      <span className="font-medium">Movie:</span>{' '}
                      {comment.movie_title ? (
                        <a
                          href={`/movie/${comment.movie_slug}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {comment.movie_title}
                        </a>
                      ) : (
                        'Unknown'
                      )}
                    </div>
                    {comment.parent_id && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Reply to comment: {comment.parent_id.substring(0, 8)}...
                      </div>
                    )}
                    {comment.position_market_type && comment.position_selected_range && comment.position_points != null && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1 inline-block">
                        Position: <span className="font-medium capitalize">{comment.position_market_type}</span> |{' '}
                        <span className="font-medium">{comment.position_selected_range}</span> |{' '}
                        <span className="font-medium">{comment.position_points?.toLocaleString() || '0'}</span> pts
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={isPending || actionLoading === comment.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === comment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={isPending || actionLoading === comment.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === comment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  {comment.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved Comments Section */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Approved Comments ({approvedComments.length})
        </h2>
        {approvedComments.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No approved comments</p>
        ) : (
          <div className="space-y-4">
            {approvedComments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {comment.username || 'Anonymous'}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(comment.created_at)}
                      </span>
                      {comment.approved_at && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Approved {formatDate(comment.approved_at)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      <span className="font-medium">Movie:</span>{' '}
                      {comment.movie_title ? (
                        <a
                          href={`/movie/${comment.movie_slug}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {comment.movie_title}
                        </a>
                      ) : (
                        'Unknown'
                      )}
                    </div>
                    {comment.parent_id && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Reply to comment: {comment.parent_id.substring(0, 8)}...
                      </div>
                    )}
                    {comment.position_market_type && comment.position_selected_range && comment.position_points != null && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-slate-700 rounded px-2 py-1 inline-block">
                        Position: <span className="font-medium capitalize">{comment.position_market_type}</span> |{' '}
                        <span className="font-medium">{comment.position_selected_range}</span> |{' '}
                        <span className="font-medium">{comment.position_points?.toLocaleString() || '0'}</span> pts
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={isPending || actionLoading === comment.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading === comment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  {comment.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

