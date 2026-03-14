'use client';

import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

type Props = {
  slug: string;
  title: string;
  releaseDate?: string | null;
  posterUrl?: string | null;
  className?: string;
};

function fmt(d?: string | null) {
  if (!d) return "";
  // Fix timezone issue: parse as local date instead of UTC
  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/* Placeholder poster: dark frame with muted "No poster" text (#A1A1AA ≈ zinc-400) */
const fallbackPoster = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%230B0B0E'/%3E%3Ctext x='100' y='150' text-anchor='middle' fill='%23A1A1AA' font-family='system-ui' font-size='14'%3ENo poster%3C/text%3E%3C/svg%3E";

function MovieCardCore({ slug, title, releaseDate, posterUrl, className = "" }: Props) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <Link
      href={`/movie/${slug}`}
      className={`group block rounded-xl overflow-hidden bg-card-gradient border border-[rgba(239,68,68,0.25)] shadow-cinema-card hover:-translate-y-[4px] hover:shadow-cinema-card-hover transition-all duration-300 ${className}`}
      aria-label={`${title}${releaseDate ? ` — releases ${fmt(releaseDate)}` : ""}`}
    >
      <div className="relative w-full aspect-[2/3] bg-cinema-page border-b border-[rgba(239,68,68,0.15)] overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-cinema-page">
            <div className="animate-pulse bg-cinema-cardHighlight w-full h-full" />
          </div>
        )}
        <Image
          src={imageError || !posterUrl ? fallbackPoster : posterUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          className={`object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-cinema-text">{title}</h3>
        {releaseDate && <p className="mt-1 text-xs text-cinema-textMuted">{fmt(releaseDate)}</p>}
      </div>
    </Link>
  );
}

export const MovieCard = memo(MovieCardCore);
