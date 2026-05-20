import type { Metadata } from 'next';
import Link from 'next/link';
import AdminPostsToolbar from '@/components/posts/AdminPostsToolbar';
import { getPosts } from '@/lib/data/posts';

export const metadata: Metadata = {
  title: 'Posts',
  description: 'Updates and notes from BoxOfficeCalls.',
};

export const revalidate = 300;

export default async function PostsPage() {
  const rows = await getPosts();

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <h1 className="text-3xl font-bold text-black">Posts</h1>
            <p className="mt-2 text-neutral-600 text-[15px]">News and updates.</p>
          </div>
          <AdminPostsToolbar />
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
