'use client';

import Link from 'next/link';

export default function InstructionsSection() {
  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 h-full min-h-[240px] flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Select an upcoming movie to place a prediction
        </h2>
        <p className="text-base text-slate-700 dark:text-slate-300">
          <Link
            href="https://substack.com/@boxofficebandits?"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline underline-offset-2 transition-colors"
          >
            Get reminders before every box office weekend
          </Link>
        </p>
      </div>
    </div>
  );
}
