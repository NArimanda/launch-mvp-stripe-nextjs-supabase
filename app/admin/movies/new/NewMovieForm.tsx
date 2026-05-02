'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export default function NewMovieForm() {
  const router = useRouter();
  const slugRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  // Track whether the user has manually edited title; if not, mirror slug into title.
  const [titleTouched, setTitleTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setSlug(next);
      if (!titleTouched) {
        setTitle(next);
      }
    },
    [titleTouched],
  );

  const handleSlugBlur = useCallback(() => {
    setSlug((cur) => {
      const normalized = normalizeSlug(cur);
      if (!titleTouched && normalized) {
        setTitle(normalized);
      }
      return normalized;
    });
  }, [titleTouched]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleTouched(true);
    setTitle(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isPending) return;
      setError(null);

      const finalSlug = normalizeSlug(slug);
      if (!finalSlug) {
        setError('Slug is required.');
        slugRef.current?.focus();
        return;
      }
      if (!title.trim()) {
        setError('Title is required.');
        titleRef.current?.focus();
        return;
      }
      if (!releaseDate) {
        setError('Release date is required.');
        return;
      }
      if (!imageUrl.trim()) {
        setError('Image URL is required.');
        return;
      }

      setIsPending(true);
      try {
        const res = await fetch('/api/admin/movies/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: finalSlug,
            title: title.trim(),
            release_date: releaseDate,
            image_url: imageUrl.trim(),
            description: description.trim(),
          }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          slug?: string;
          error?: string;
        };

        if (!res.ok) {
          setError(json.error || `Request failed (${res.status})`);
          setIsPending(false);
          return;
        }

        const newSlug = json.slug || finalSlug;
        router.push(`/movie/${newSlug}`);
        router.refresh();
      } catch (err) {
        console.error('create movie:', err);
        setError('Network error. Please try again.');
        setIsPending(false);
      }
    },
    [description, imageUrl, isPending, releaseDate, router, slug, title],
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {error ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="movie-slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Slug
        </label>
        <input
          ref={slugRef}
          id="movie-slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={handleSlugChange}
          onBlur={handleSlugBlur}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase letters, numbers, hyphens only"
          placeholder="movie-name"
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono text-sm"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          URL-safe identifier used in <code>/movie/&lt;slug&gt;</code>. Auto-normalized on blur.
        </p>
      </div>

      <div>
        <label htmlFor="movie-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Title
        </label>
        <input
          ref={titleRef}
          id="movie-title"
          name="title"
          type="text"
          required
          value={title}
          onChange={handleTitleChange}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Defaults to the slug; edit independently if you want different display text.
        </p>
      </div>

      <div>
        <label htmlFor="movie-release-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Release date
        </label>
        <input
          id="movie-release-date"
          name="release_date"
          type="date"
          required
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="movie-image-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Image URL
        </label>
        <input
          id="movie-image-url"
          name="image_url"
          type="url"
          required
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white text-sm"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Paste a Supabase Storage public URL (must start with <code>https://</code>).
        </p>
      </div>

      <div>
        <label htmlFor="movie-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Description
        </label>
        <textarea
          id="movie-description"
          name="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white text-sm whitespace-pre-wrap"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Adding movie…' : 'Add movie'}
      </button>
    </form>
  );
}
