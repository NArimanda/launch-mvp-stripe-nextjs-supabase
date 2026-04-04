'use client';

import { useActionState, useCallback, useRef } from 'react';
import { createPost } from '../actions';

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export default function NewPostForm() {
  const [error, formAction, isPending] = useActionState(createPost, null);
  const titleRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  const generateSlug = useCallback(() => {
    const t = titleRef.current?.value?.trim() ?? '';
    if (!slugRef.current || !t) return;
    slugRef.current.value = slugFromTitle(t);
  }, []);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {error ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="post-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Title
        </label>
        <input
          ref={titleRef}
          id="post-title"
          name="title"
          type="text"
          required
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label htmlFor="post-slug" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Slug
          </label>
          <button
            type="button"
            onClick={generateSlug}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Generate from title
          </button>
        </div>
        <input
          ref={slugRef}
          id="post-slug"
          name="slug"
          type="text"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase letters, numbers, hyphens only"
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono text-sm"
        />
      </div>

      <div>
        <label htmlFor="post-teaser" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Teaser image URL (optional)
        </label>
        <input
          id="post-teaser"
          name="teaser_image_url"
          type="text"
          inputMode="url"
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white text-sm"
          placeholder="https://…"
        />
      </div>

      <div>
        <label htmlFor="post-body" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Body
        </label>
        <textarea
          id="post-body"
          name="body"
          rows={12}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white text-sm whitespace-pre-wrap"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Publishing…' : 'Publish post'}
      </button>
    </form>
  );
}
