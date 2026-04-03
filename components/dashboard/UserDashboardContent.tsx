"use client";

import { useState, useEffect, useLayoutEffect, useRef, useActionState } from 'react';
import { motion } from 'framer-motion';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Wallet,
  Activity,
  History
} from 'lucide-react';
import Image from 'next/image';
import { restoreBalance } from '@/app/actions/walletActions';
import html2canvas from 'html2canvas';

interface UserBet {
  id: string;
  market_id: string;
  selected_range: string;
  points: number;
  potential_payout: number;
  status: string;
  outcome: string | null;
  placed_at?: string;
  market: {
    movie_id: string;
    type: string;
    timeframe: string;
    status: string;
    outcome?: number | null;
  };
  movie: {
    slug: string;
    release_date: string;
    image_url: string;
  };
}

function formatPointsValue(n: number, fractionDigits: 0 | 2 = 0): string {
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} points`;
}

/** Display stored range (e.g. "10-30", "[10 - 30]", "400+") as "$10 million – $30 million". Values are box office millions. */
function formatBetRangeDisplay(selectedRange: string): string {
  const cleaned = selectedRange.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return selectedRange;

  const millionPart = (n: number) => {
    if (!Number.isFinite(n)) return null;
    const s = Number.isInteger(n)
      ? n.toLocaleString()
      : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `$${s} million`;
  };

  if (cleaned.endsWith('+')) {
    const raw = cleaned.slice(0, -1).trim();
    const n = parseFloat(raw);
    const part = millionPart(n);
    return part ? `${part}+` : selectedRange;
  }

  const parts = cleaned.split(/\s*[-–]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    const left = millionPart(a);
    const right = millionPart(b);
    if (left && right) return `${left} – ${right}`;
    return selectedRange;
  }

  const single = parseFloat(cleaned);
  const one = millionPart(single);
  return one ?? selectedRange;
}

/** Compact range for share cards, e.g. $0–$20M or $150M+ */
function formatBetRangeCompact(selectedRange: string): string {
  const cleaned = selectedRange.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return selectedRange;
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  if (cleaned.endsWith('+')) {
    const n = parseFloat(cleaned.slice(0, -1).trim());
    if (!Number.isFinite(n)) return formatBetRangeDisplay(selectedRange);
    return `$${fmt(n)}M+`;
  }
  const parts = cleaned.split(/\s*[-–]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return `$${fmt(a)}–$${fmt(b)}M`;
  }
  const single = parseFloat(cleaned);
  if (Number.isFinite(single)) return `$${fmt(single)}M`;
  return formatBetRangeDisplay(selectedRange);
}

function slugToDisplayTitle(slug: string): string {
  if (!slug?.trim()) return 'Unknown title';
  return slug
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function betCardTimeframeHeadline(timeframe: string): string {
  const t = timeframe.toLowerCase();
  if (t === 'weekend') return 'Opening Weekend';
  if (t === 'month') return 'Opening Month';
  return timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
}

function betCardMarketScopeLabel(marketType: string): string {
  const t = marketType.toLowerCase();
  if (t === 'worldwide') return 'Worldwide';
  if (t === 'domestic') return 'Domestic';
  return marketType.charAt(0).toUpperCase() + marketType.slice(1);
}

function formatShareCardDate(value: string | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const BET_SHARE_CARD_BG = 'linear-gradient(165deg, #2a1518 0%, #180d10 42%, #0e080a 100%)';
const BET_SHARE_CARD_CANVAS_BG = '#14090c';

interface UserDashboardContentProps {
  username: string;
  pendingBets: UserBet[];
  historyBets: UserBet[];
  balance?: number | null;
  isOwnDashboard?: boolean;
  loading?: boolean;
  totalPredictions: number;
  pendingPredictions: number;
  settledPredictions: number;
  predictionAccuracy?: number | null;
}

function RestoreBalanceSubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Restoring...' : 'restore balance - 500'}
    </button>
  );
}

function RestoreBalanceForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(restoreBalance, null);
  const prevStateRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  
  // Handle state changes and refresh on success
  useEffect(() => {
    // Only process if state has changed from previous
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      
      // If state is null (success) and we've submitted, refresh
      if (state === null && submittedRef.current) {
        router.refresh();
        submittedRef.current = false; // Reset for next submission
      }
    }
  }, [state, router]);
  
  const handleSubmit = () => {
    submittedRef.current = true;
  };
  
  return (
    <form action={formAction} onSubmit={handleSubmit}>
      {state && state !== null && (
        <div className="mb-2 text-sm text-red-600 dark:text-red-400">
          {state}
        </div>
      )}
      <RestoreBalanceSubmitButton />
    </form>
  );
}

/** Stats card PNG export: fixed square and safe padding (inner content lives in the inset area). */
const STATS_CARD_EXPORT_PX = 1080;
const STATS_CARD_SAFE_PADDING_PX = 80;
const STATS_CARD_INNER_PX = STATS_CARD_EXPORT_PX - 2 * STATS_CARD_SAFE_PADDING_PX;

/**
 * Clone the card into an off-screen host with no CSS transform ancestors, then rasterize.
 * Avoids html2canvas overlapping/garbled text when the live preview sits under scale(...).
 */
async function rasterizeShareCardToPng(
  sourceElement: HTMLElement,
  options: { backgroundColor: string; fileName: string }
): Promise<void> {
  const { backgroundColor, fileName } = options;
  const exportSize = STATS_CARD_EXPORT_PX;
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${exportSize}px`,
    `height:${exportSize}px`,
    'overflow:hidden',
    'visibility:visible',
    'pointer-events:none',
    'margin:0',
    'padding:0',
    'border:none',
    'z-index:0',
  ].join(';');

  document.body.appendChild(host);
  host.appendChild(clone);

  let canvas: HTMLCanvasElement;
  try {
    if (typeof document.fonts?.ready?.then === 'function') {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    canvas = await html2canvas(clone, {
      backgroundColor,
      scale: 1,
      width: exportSize,
      height: exportSize,
      useCORS: true,
    });
  } finally {
    document.body.removeChild(host);
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('PNG toBlob returned null'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      },
      'image/png',
      1
    );
  });
}

function statsCardHeroFontSizePx(valueDisplay: string): number {
  const len = valueDisplay.length;
  if (len > 24) return 48;
  if (len > 20) return 56;
  if (len > 16) return 72;
  if (len > 13) return 88;
  if (len > 11) return 96;
  return 112;
}

interface StatsCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  availablePoints: number;
  totalValue: number;
  predictionAccuracy?: number | null;
  totalPredictions: number;
  pendingPredictions: number;
}

function StatsCardModal({
  isOpen,
  onClose,
  username,
  availablePoints,
  totalValue,
  predictionAccuracy,
  totalPredictions,
  pendingPredictions
}: StatsCardModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.45);

  const accuracyPercent = predictionAccuracy != null ? (predictionAccuracy * 100).toFixed(1) : '--';
  const totalValueDisplay = `${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} points`;
  const heroFontPx = statsCardHeroFontSizePx(totalValueDisplay);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = previewViewportRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const w = Math.max(0, rect.width - margin);
      const h = Math.max(0, rect.height - margin);
      const s = Math.min(w / STATS_CARD_EXPORT_PX, h / STATS_CARD_EXPORT_PX, 1);
      setPreviewScale(Number.isFinite(s) && s > 0 ? Math.max(0.1, s) : 0.1);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen]);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      await rasterizeShareCardToPng(cardRef.current, {
        backgroundColor: '#0B0B0E',
        fileName: 'stats-card.png',
      });
    } catch (err) {
      console.error('Failed to generate stats card image:', err);
    }
  };

  if (!isOpen) return null;

  const cardBoxStyle = {
    width: STATS_CARD_EXPORT_PX,
    height: STATS_CARD_EXPORT_PX,
    boxSizing: 'border-box' as const,
    padding: STATS_CARD_SAFE_PADDING_PX,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-1 sm:p-2">
      <div className="bg-cinema-card border border-cinema-border text-cinema-text rounded-lg sm:rounded-xl shadow-cinema-card flex flex-col min-h-0 w-[calc(100vw-8px)] h-[calc(100dvh-8px)] max-w-[calc(100vw-8px)] max-h-[calc(100dvh-8px)] sm:w-[calc(100vw-16px)] sm:h-[calc(100dvh-16px)] sm:max-w-[calc(100vw-16px)] sm:max-h-[calc(100dvh-16px)]">
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-cinema-border shrink-0">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cinema-textMuted">
            Stats Card Preview
          </h3>
          <button
            onClick={onClose}
            className="text-cinema-textMuted hover:text-cinema-text text-sm px-2 py-1 rounded-md hover:bg-cinema-cardHighlight"
          >
            Close
          </button>
        </div>

        <div className="px-2 py-2 sm:px-3 sm:py-3 flex flex-col min-h-0 flex-1 overflow-hidden gap-2 sm:gap-3">
          <div
            ref={previewViewportRef}
            className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden rounded-md sm:rounded-lg border border-cinema-border/60 bg-cinema-page/30"
          >
            <div
              className="shrink-0"
              style={{
                width: STATS_CARD_EXPORT_PX * previewScale,
                height: STATS_CARD_EXPORT_PX * previewScale,
                position: 'relative',
              }}
            >
              <div
                className="shrink-0"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: STATS_CARD_EXPORT_PX,
                  height: STATS_CARD_EXPORT_PX,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  ref={cardRef}
                  style={cardBoxStyle}
                  className="bg-cinema-cardHighlight shadow-inner border border-cinema-border flex flex-col justify-between overflow-hidden min-w-0"
                >
                  <div
                    className="min-h-0 shrink-0 min-w-0 max-w-full"
                    style={{ maxWidth: STATS_CARD_INNER_PX }}
                  >
                    <p
                      className="font-semibold tracking-tight text-cinema-text leading-tight break-words [overflow-wrap:anywhere] max-w-full"
                      style={{ fontSize: 36, lineHeight: 1.15 }}
                    >
                      {username}
                    </p>
                    <p
                      className="mt-4 font-bold text-emerald-400 leading-tight tabular-nums break-words [overflow-wrap:anywhere] max-w-full"
                      style={{ fontSize: heroFontPx, lineHeight: 1.05 }}
                    >
                      {totalValueDisplay}
                    </p>
                  </div>

                  <div
                    className="flex-1 flex flex-col justify-center py-6 min-h-0 min-w-0 overflow-hidden"
                    style={{ maxWidth: STATS_CARD_INNER_PX }}
                  >
                    <div className="space-y-4 text-[26px] min-w-0 w-full">
                      <div className="flex items-baseline justify-between gap-4 min-w-0">
                        <span className="text-cinema-textMuted shrink-0">Accuracy</span>
                        <span className="font-medium text-cinema-text text-right min-w-0 break-words">
                          {accuracyPercent}
                          {accuracyPercent !== '--' ? '%' : ''}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 min-w-0">
                        <span className="text-cinema-textMuted shrink-0">Predictions</span>
                        <span className="font-medium text-cinema-text tabular-nums shrink-0">
                          {totalPredictions.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 min-w-0">
                        <span className="text-cinema-textMuted shrink-0">Pending</span>
                        <span className="font-medium text-cinema-text tabular-nums shrink-0">
                          {pendingPredictions.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 min-w-0">
                        <span className="text-cinema-textMuted shrink-0">Balance</span>
                        <span className="font-medium text-cinema-text tabular-nums shrink-0">
                          {availablePoints.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="shrink-0 pt-4 border-t border-cinema-border/60 text-center space-y-2 min-w-0 px-1 w-full"
                    style={{ maxWidth: STATS_CARD_INNER_PX }}
                  >
                    <p className="text-[24px] font-semibold text-cinema-text break-words">boxofficecalls.com</p>
                    <p className="text-[20px] text-cinema-textMuted leading-snug break-words [hyphens:auto]">
                      Track your calls. Prove your edge.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 shrink-0">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BetCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  bet: UserBet;
  isHistory: boolean;
}

function BetCardModal({
  isOpen,
  onClose,
  username,
  bet,
  isHistory,
}: BetCardModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.45);

  const sharePlacedDate = formatShareCardDate(bet.placed_at);
  const shareReleaseDate = formatShareCardDate(bet.movie.release_date);
  const compactRange = formatBetRangeCompact(bet.selected_range);
  const movieTitle = slugToDisplayTitle(bet.movie.slug);
  const timeframeHeadline = betCardTimeframeHeadline(bet.market.timeframe);
  const marketScope = betCardMarketScopeLabel(bet.market.type);
  const atUsername = username.startsWith('@') ? username : `@${username}`;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = previewViewportRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const w = Math.max(0, rect.width - margin);
      const h = Math.max(0, rect.height - margin);
      const s = Math.min(w / STATS_CARD_EXPORT_PX, h / STATS_CARD_EXPORT_PX, 1);
      setPreviewScale(Number.isFinite(s) && s > 0 ? Math.max(0.1, s) : 0.1);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen, bet.id]);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      await rasterizeShareCardToPng(cardRef.current, {
        backgroundColor: BET_SHARE_CARD_CANVAS_BG,
        fileName: 'bet-card.png',
      });
    } catch (err) {
      console.error('Failed to generate bet card image:', err);
    }
  };

  if (!isOpen) return null;

  const cardBoxStyle = {
    width: STATS_CARD_EXPORT_PX,
    height: STATS_CARD_EXPORT_PX,
    boxSizing: 'border-box' as const,
    padding: STATS_CARD_SAFE_PADDING_PX,
    background: BET_SHARE_CARD_BG,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-1 sm:p-2">
      <div className="bg-cinema-card border border-cinema-border text-cinema-text rounded-lg sm:rounded-xl shadow-cinema-card flex flex-col min-h-0 w-[calc(100vw-8px)] h-[calc(100dvh-8px)] max-w-[calc(100vw-8px)] max-h-[calc(100dvh-8px)] sm:w-[calc(100vw-16px)] sm:h-[calc(100dvh-16px)] sm:max-w-[calc(100vw-16px)] sm:max-h-[calc(100dvh-16px)]">
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-cinema-border shrink-0">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-cinema-textMuted">
            {isHistory ? 'Bet Card – Settled' : 'Bet Card – Pending'}
          </h3>
          <button
            onClick={onClose}
            className="text-cinema-textMuted hover:text-cinema-text text-sm px-2 py-1 rounded-md hover:bg-cinema-cardHighlight"
          >
            Close
          </button>
        </div>

        <div className="px-2 py-2 sm:px-3 sm:py-3 flex flex-col min-h-0 flex-1 overflow-hidden gap-2 sm:gap-3">
          <div
            ref={previewViewportRef}
            className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden rounded-md sm:rounded-lg border border-cinema-border/60 bg-cinema-page/30"
          >
            <div
              className="shrink-0"
              style={{
                width: STATS_CARD_EXPORT_PX * previewScale,
                height: STATS_CARD_EXPORT_PX * previewScale,
                position: 'relative',
              }}
            >
              <div
                className="shrink-0"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: STATS_CARD_EXPORT_PX,
                  height: STATS_CARD_EXPORT_PX,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  ref={cardRef}
                  style={cardBoxStyle}
                  className="shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] border border-[#3d1f26]/80 flex flex-col overflow-hidden min-w-0 text-[#f4e8ea]"
                >
                  <div
                    className="flex flex-col flex-1 min-h-0 min-w-0 w-full"
                    style={{ maxWidth: STATS_CARD_INNER_PX }}
                  >
                    {/* Identity */}
                    <p
                      className="shrink-0 tracking-tight text-white/55 break-words [overflow-wrap:anywhere]"
                      style={{ fontSize: 26, lineHeight: 1.2 }}
                    >
                      {atUsername}
                    </p>

                    {/* Poster */}
                    <div
                      className="mt-3 shrink-0 w-full overflow-hidden rounded-2xl border border-white/12 bg-black/40 flex items-center justify-center"
                      style={{ height: 252 }}
                    >
                      {bet.movie.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- html2canvas-friendly poster for export
                        <img
                          src={bet.movie.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-[20px] tracking-[0.2em] uppercase text-white/35">
                          No Poster
                        </span>
                      )}
                    </div>

                    {/* Main story */}
                    <div className="mt-4 shrink-0 min-w-0 space-y-1">
                      <h2
                        className="font-bold tracking-tight text-white break-words [overflow-wrap:anywhere]"
                        style={{ fontSize: 46, lineHeight: 1.12 }}
                      >
                        {movieTitle}
                      </h2>
                      <p
                        className="font-medium text-white/65 tracking-wide"
                        style={{ fontSize: 26, lineHeight: 1.25 }}
                      >
                        {timeframeHeadline}
                      </p>
                      <p
                        className="font-bold tracking-tight text-white break-words [overflow-wrap:anywhere] tabular-nums pt-1"
                        style={{ fontSize: 46, lineHeight: 1.12 }}
                      >
                        {compactRange}
                      </p>
                      <p className="text-[18px] text-white/45 pt-0.5">
                        Market: {marketScope}
                      </p>
                    </div>

                    <div className="my-4 shrink-0 h-px w-full bg-white/12" aria-hidden />

                    {/* Bet details */}
                    <div className="shrink-0 space-y-2.5 min-w-0" style={{ fontSize: 26, lineHeight: 1.35 }}>
                      <p className="text-white/90">
                        Bet:{' '}
                        <span className="font-semibold tabular-nums text-white">
                          {bet.points.toLocaleString()} pts
                        </span>
                      </p>
                      <p className="text-white/90">
                        Potential:{' '}
                        <span className="font-semibold tabular-nums text-emerald-400">
                          {bet.potential_payout.toLocaleString()} pts
                        </span>
                      </p>
                      <p className="text-white/90">
                        Status:{' '}
                        <span className="font-semibold text-white">{bet.status}</span>
                      </p>
                    </div>

                    <div className="my-4 shrink-0 h-px w-full bg-white/12" aria-hidden />

                    {/* Metadata */}
                    <div
                      className="shrink-0 space-y-1.5 text-white/50 min-w-0"
                      style={{ fontSize: 19, lineHeight: 1.35 }}
                    >
                      <p className="break-words">
                        Release: <span className="text-white/70">{shareReleaseDate}</span>
                      </p>
                      <p className="break-words">
                        Placed: <span className="text-white/70">{sharePlacedDate}</span>
                      </p>
                    </div>

                    <div className="flex-1 min-h-[8px]" aria-hidden />

                    {/* Footer */}
                    <div className="shrink-0 pt-5 mt-auto border-t border-white/15 text-center space-y-1.5 w-full">
                      <p
                        className="font-semibold tracking-wide text-white/90"
                        style={{ fontSize: 24, letterSpacing: '0.02em' }}
                      >
                        boxofficecalls.com
                      </p>
                      <p className="text-[18px] text-white/45 leading-snug px-2">
                        Track your calls. Prove your edge.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 shrink-0">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-primary hover:bg-primary-dark text-white transition-colors"
            >
              Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardContent({
  username,
  pendingBets,
  historyBets,
  balance,
  isOwnDashboard = false,
  loading = false,
  totalPredictions,
  pendingPredictions,
  settledPredictions,
  predictionAccuracy
}: UserDashboardContentProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeBetModal, setActiveBetModal] = useState<{ bet: UserBet; isHistory: boolean } | null>(null);

  const totalValue = (balance ?? 0) + pendingBets.reduce((sum, b) => sum + b.points, 0);
  const accuracyPercent = predictionAccuracy != null ? (predictionAccuracy * 100).toFixed(1) : null;

  const formatCurrency = (points: number) => {
    return points.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-cinema-page">
      {/* Portfolio Header */}
      <div className="bg-cinema-card border-b border-cinema-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cinema-text">
              {isOwnDashboard ? 'Portfolio' : `${username}'s Dashboard`}
            </h1>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Balance Section - show for own and other user dashboards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-cinema-text">
              Portfolio Balance
            </h2>
            {isOwnDashboard && (
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(true)}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-cinema-border text-cinema-text hover:bg-cinema-cardHighlight transition-colors"
              >
                View Stats Card
              </button>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-900/30 rounded-lg border border-cinema-border">
                    <Wallet className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-cinema-textMuted">Available Points</p>
                    <div className="text-2xl font-bold text-cinema-text">
                      {loading ? (
                        <div className="animate-pulse bg-cinema-cardHighlight h-8 w-24 rounded"></div>
                      ) : (
                        formatCurrency(balance || 0)
                      )}
                    </div>
                  </div>
                </div>
                {/* Restore Balance Button - only on own dashboard when eligible */}
                {isOwnDashboard && balance != null && balance < 250 && (
                  <RestoreBalanceForm />
                )}
              </div>
              <div className="text-right space-y-1">
                <div>
                  <p className="text-sm text-cinema-textMuted">Total Value</p>
                  <div className="text-lg font-semibold text-green-400">
                    {loading ? (
                      <div className="animate-pulse bg-cinema-cardHighlight h-6 w-16 rounded"></div>
                    ) : (
                      `${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} points`
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-cinema-textMuted space-y-0.5">
                  <div>
                    Prediction Accuracy:{' '}
                    {accuracyPercent != null ? `${accuracyPercent}%` : '--'}
                  </div>
                  <div>
                    Total Predictions: {totalPredictions}
                  </div>
                  <div>
                    Pending Predictions: {pendingPredictions}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex items-center space-x-1 bg-cinema-card rounded-lg p-1 border border-cinema-border">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-cinema-cardHighlight text-cinema-accent'
                  : 'text-cinema-textMuted hover:text-cinema-text'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Pending Bets ({pendingBets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-cinema-cardHighlight text-cinema-accent'
                  : 'text-cinema-textMuted hover:text-cinema-text'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Bet History ({historyBets.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'pending' ? (
          /* Pending Bets Section */
          <div>
            <h2 className="text-xl font-semibold text-cinema-text mb-4">
              Pending Bets ({pendingBets.length})
            </h2>
          
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border">
                    <div className="animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-cinema-cardHighlight rounded w-3/4"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/2"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingBets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cinema-card rounded-xl p-8 shadow-cinema-card border border-cinema-border text-center"
              >
                <Activity className="h-12 w-12 text-cinema-textMuted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cinema-text mb-2">
                  No Pending Bets
                </h3>
                <p className="text-cinema-textMuted">
                  {isOwnDashboard 
                    ? "You haven't placed any bets yet. Start predicting movie performance to see your bets here!"
                    : `${username} hasn't placed any pending bets.`}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {pendingBets.map((bet, index) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border hover:shadow-cinema-card-hover transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Movie Poster */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
                        {bet.movie.image_url ? (
                          <Image
                            src={bet.movie.image_url}
                            alt={bet.movie.slug}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-cinema-textMuted">No poster</span>
                          </div>
                        )}
                      </div>

                      {/* Bet Details */}
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-cinema-textMuted">Movie</p>
                            <p className="font-medium text-cinema-text">{bet.movie.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Release Date</p>
                            <p className="font-medium text-cinema-text">{bet.movie.release_date}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Market Type</p>
                            <p className="font-medium text-cinema-text">{bet.market.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Timeframe</p>
                            <p className="font-medium text-cinema-text">{bet.market.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Selected Range</p>
                            <p className="font-medium text-cinema-text">{formatBetRangeDisplay(bet.selected_range)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Points</p>
                            <p className="font-medium text-cinema-text">{formatPointsValue(bet.points)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Potential payout (points)</p>
                            <p className="font-medium text-green-400">{formatPointsValue(bet.potential_payout)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Status</p>
                            <p className="font-medium text-cinema-text">{bet.status}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Outcome</p>
                            <p className="font-medium text-cinema-text">{bet.outcome || 'Pending'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Placed At</p>
                            <p className="font-medium text-cinema-text">
                              {bet.placed_at ? new Date(bet.placed_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveBetModal({ bet, isHistory: false })}
                        className="inline-flex text-xs text-cinema-accent hover:underline"
                      >
                        View Bet Card
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* History Section */
          <div>
            <h2 className="text-xl font-semibold text-cinema-text mb-4">
              Bet History ({historyBets.length})
            </h2>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border">
                    <div className="animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-cinema-cardHighlight rounded w-3/4"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/2"></div>
                        <div className="h-3 bg-cinema-cardHighlight rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : historyBets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cinema-card rounded-xl p-8 shadow-cinema-card border border-cinema-border text-center"
              >
                <History className="h-12 w-12 text-cinema-textMuted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-cinema-text mb-2">
                  No Bet History
                </h3>
                <p className="text-cinema-textMuted">
                  {isOwnDashboard 
                    ? "You haven't completed any bets yet. Your resolved bets will appear here!"
                    : `${username} hasn't completed any bets yet.`}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {historyBets.map((bet, index) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-cinema-card rounded-xl p-6 shadow-cinema-card border border-cinema-border hover:shadow-cinema-card-hover transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Movie Poster */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-cinema-page border border-cinema-border">
                        {bet.movie.image_url ? (
                          <Image
                            src={bet.movie.image_url}
                            alt={bet.movie.slug}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-cinema-textMuted">No poster</span>
                          </div>
                        )}
                      </div>

                      {/* Bet Details */}
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-cinema-textMuted">Movie</p>
                            <p className="font-medium text-cinema-text">{bet.movie.slug}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Placed At</p>
                            <p className="font-medium text-cinema-text">
                              {bet.placed_at ? new Date(bet.placed_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Market Type</p>
                            <p className="font-medium text-cinema-text">{bet.market.type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Timeframe</p>
                            <p className="font-medium text-cinema-text">{bet.market.timeframe}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Selected Range</p>
                            <p className="font-medium text-cinema-text">{formatBetRangeDisplay(bet.selected_range)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Points</p>
                            <p className="font-medium text-cinema-text">{formatPointsValue(bet.points)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Potential payout (points)</p>
                            <p className="font-medium text-green-400">{formatPointsValue(bet.potential_payout)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Status</p>
                            <p className="font-medium text-cinema-text">{bet.status}</p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Bet Result</p>
                            <p className={`font-medium ${
                              bet.outcome === 'won' ? 'text-green-400' :
                              bet.outcome === 'lost' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {bet.outcome ? (bet.outcome.charAt(0).toUpperCase() + bet.outcome.slice(1)) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-cinema-textMuted">Box office (USD)</p>
                            <p className="font-medium text-cinema-text">
                              {bet.market.outcome !== null && bet.market.outcome !== undefined 
                                ? (() => {
                                    const valueInMillions = Number(bet.market.outcome) / 1000000;
                                    return `$${valueInMillions.toFixed(1)}M`;
                                  })()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setActiveBetModal({ bet, isHistory: true })}
                        className="inline-flex text-xs text-cinema-accent hover:underline"
                      >
                        View Bet Card
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Card Modal - own dashboard only */}
      {isOwnDashboard && (
        <StatsCardModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          username={username}
          availablePoints={balance || 0}
          totalValue={totalValue}
          predictionAccuracy={predictionAccuracy}
          totalPredictions={totalPredictions}
          pendingPredictions={pendingPredictions}
        />
      )}

      {/* Bet Card Modal for individual bets */}
      {activeBetModal && (
        <BetCardModal
          isOpen={true}
          onClose={() => setActiveBetModal(null)}
          username={username}
          bet={activeBetModal.bet}
          isHistory={activeBetModal.isHistory}
        />
      )}
    </div>
  );
}

