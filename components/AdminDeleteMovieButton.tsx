'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  movieId: string;
  movieTitle: string;
};

export default function AdminDeleteMovieButton({ movieId, movieTitle }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/movies/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || 'Failed to delete movie');
        return;
      }

      setShowConfirm(false);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Failed to delete movie');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-red-400/90 mb-2">
          Admin
        </p>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          className="rounded-md border border-red-500 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Delete movie
        </button>
        <p className="mt-2 text-xs text-cinema-textMuted">
          Removes markets, bets, comments, and refunds bet stakes to wallets. Resolved markets are
          unresolved first.
        </p>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-md rounded-lg border border-cinema-border bg-cinema-card p-6 shadow-cinema-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-movie-title"
          >
            <h3
              id="delete-movie-title"
              className="text-lg font-semibold text-cinema-text mb-2"
            >
              Delete this movie?
            </h3>
            <p className="text-sm text-cinema-textMuted mb-4">
              <span className="font-medium text-cinema-text">{movieTitle}</span> will be removed
              permanently along with its markets, bets, and comments. User wallets will be credited
              for outstanding bet stakes.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-cinema-text hover:bg-cinema-cardHighlight rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
