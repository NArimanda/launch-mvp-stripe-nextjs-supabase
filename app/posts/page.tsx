import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'Posts',
  description: 'Updates and notes from BoxOfficeCalls.',
};

export default async function PostsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin === true;
  }

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, teaser_image_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('posts list:', error);
  }

  const rows = posts ?? [];

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-3xl font-bold text-black">Posts</h1>
            <p className="mt-2 text-neutral-600 text-[15px]">News and updates.</p>
          </div>
          {isAdmin ? (
            <Link
              href="/admin/posts/new"
              className="shrink-0 inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              New post
            </Link>
          ) : null}
        </header>

        {rows.length === 0 ? (
          <p className="text-neutral-600 text-[15px]">No posts yet.</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2">
            {rows.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group block rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50/50 hover:border-neutral-400 transition-colors"
                >
                  <div className="aspect-video bg-neutral-200 relative overflow-hidden">
                    {post.teaser_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.teaser_image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold text-black group-hover:underline decoration-neutral-400">
                      {post.title}
                    </h2>
                    <time
                      dateTime={post.created_at}
                      className="mt-1 block text-xs text-neutral-500"
                    >
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
