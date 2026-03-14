'use client';

import Link from 'next/link';

export default function InstructionsSection() {
  return (
    <div className="mb-6">
      <div className="bg-cinema-sectionPanel rounded-xl p-8 border border-[rgba(239,68,68,0.12)] h-full min-h-[240px] flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-cinema-text mb-3">
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
