'use client';

import Link from 'next/link';

export default function InstructionsSection() {
  return (
    <div className="mb-6">
      <div className="bg-cinema-sectionPanel rounded-xl px-6 py-4 border border-[rgba(239,68,68,0.12)]">
        <h2 className="text-[20px] font-semibold leading-[1.3] text-cinema-text mb-1.5">
          Select an upcoming movie to place a prediction
        </h2>
        <p className="text-base text-cinema-textMuted">
          <Link
            href="https://substack.com/@boxofficebandits?"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cinema-accent hover:text-cinema-accentWarm font-medium underline underline-offset-2 transition-colors"
          >
            Get reminders before every box office weekend
          </Link>
        </p>
      </div>
    </div>
  );
}
