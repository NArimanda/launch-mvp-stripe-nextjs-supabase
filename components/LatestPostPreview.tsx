import Link from 'next/link';

type Props = {
  slug: string;
  title: string;
  teaser_image_url: string | null;
};

export default function LatestPostPreview({ slug, title, teaser_image_url }: Props) {
  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-[rgba(239,68,68,0.12)] bg-cinema-sectionPanel p-6">
        <Link
          href={`/posts/${slug}`}
          className="group mx-auto block w-full max-w-2xl overflow-hidden rounded-xl outline-none ring-offset-2 ring-offset-cinema-page focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Wider than 16:9 so the strip is shorter; max-w caps width so height scales down with ratio */}
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl bg-cinema-card">
            {teaser_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teaser_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-cinema-card via-cinema-cardHighlight to-cinema-border"
                aria-hidden
              />
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70 sm:text-xs">
                Latest
              </p>
              <h2 className="text-lg font-semibold leading-snug tracking-tight text-white drop-shadow-md sm:text-xl">
                {title}
              </h2>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
