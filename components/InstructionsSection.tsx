'use client';

import Link from 'next/link';

export default function InstructionsSection() {
  return (
    <div className="mb-8">
      <div className="bg-cinema-sectionPanel/80 rounded-xl px-8 py-12 border border-[rgba(255,255,255,0.08)]">
        <h1 className="text-[36px] sm:text-[44px] lg:text-[48px] font-bold leading-[1.2] text-[#f5f5f5] max-w-[800px]">
          Pick a movie.{' '}
          <span className="text-cinema-accent">Make a call.</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-cinema-textMuted/70">
          <Link
            href="https://substack.com/@boxofficecalls"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cinema-accent font-medium underline underline-offset-2 transition-colors"
          >
            Get reminders before every box office weekend
          </Link>
        </p>
      </div>
    </div>
  );
}
