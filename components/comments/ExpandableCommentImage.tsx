'use client';

import { useState } from 'react';

interface ExpandableCommentImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function ExpandableCommentImage({ 
  src, 
  alt = 'Comment attachment',
  className = '' 
}: ExpandableCommentImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (hasError) {
    return (
      <div className={`mb-3 ${className}`}>
        <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Image failed to load</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 ${className}`}>
      <button
        onClick={toggleExpand}
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        type="button"
        aria-label={isExpanded ? 'Collapse image' : 'Expand image'}
      >
        {isExpanded ? (
          <div className="mt-2 transition-all">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-300 dark:border-slate-600 cursor-zoom-out"
              draggable={false}
              loading="lazy"
              onError={() => setHasError(true)}
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click to collapse
            </div>
          </div>
        ) : (
          <div className="relative w-40 h-40 overflow-hidden rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-zoom-in hover:opacity-90 transition-opacity">
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain"
              draggable={false}
              loading="lazy"
              onError={() => setHasError(true)}
            />
            <div className="absolute bottom-1 right-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded opacity-75">
              Click to expand
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

