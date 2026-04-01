import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.08)] mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-cinema-textMuted flex items-center justify-between gap-4">
        <span>Box Office Bandits</span>
        <Link
          href="/privacypolicy"
          className="hover:text-cinema-text transition-colors underline underline-offset-2"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
