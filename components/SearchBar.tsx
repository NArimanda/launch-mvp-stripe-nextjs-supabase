'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Result = { id: string; slug: string; title: string; image_url: string | null; release_date: string | null; };

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);

  const debouncedQ = useMemo(() => q, [q]); // simple; can add real debounce

  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (active) setResults(json.results || []);
    })();
    return () => { active = false; };
  }, [debouncedQ]);

  return (
    <div className="relative w-full max-w-lg">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search movies…"
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md max-h-80 overflow-auto">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/movie/${r.slug}`}
              className="block px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {r.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
