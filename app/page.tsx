"use client";

import HeroCarousel from '@/components/HeroCarousel';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Featured Articles
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Discover the latest insights and stories
          </p>
        </div>
        
        <HeroCarousel />
      </div>
    </div>
  );
}

