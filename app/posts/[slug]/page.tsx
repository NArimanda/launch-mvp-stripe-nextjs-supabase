import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, body')
    .eq('slug', slug)
    .maybeSingle();

  if (!post) {
    return { title: 'Post' };
  }

  const firstLine =
    String(post.body ?? '')
      .split(/\r?\n/)
      .find((line: string) => line.trim()) ?? '';
  const description =
    firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine || undefined;

  return {
    title: post.title,
    description,
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from('posts')
    .select('title, slug, teaser_image_url, body, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  const bodyText = String(post.body);
  const paragraphs: string[] = bodyText.trim()
    ? bodyText.split(/\n{2,}/)
    : [];

  return (
    <article className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-black">{post.title}</h1>
          <time
            dateTime={post.created_at}
            className="mt-2 block text-sm text-neutral-500"
          >
            {new Date(post.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </header>

        {post.teaser_image_url ? (
          <div className="mb-8 rounded-lg overflow-hidden border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.teaser_image_url}
              alt=""
              className="w-full max-h-[min(70vh,560px)] object-cover"
            />
          </div>
        ) : null}

        <div className="space-y-4 text-[15px] leading-relaxed text-neutral-800">
          {paragraphs.length === 0 ? null : paragraphs.map((block, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {block}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
