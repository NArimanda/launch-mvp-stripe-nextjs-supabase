'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

/**
 * Manual $pageview capture (posthog init uses capture_pageview: false).
 * Must render inside PostHogProvider.
 */
export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname || !posthog) return;
    let url = `${window.location.origin}${pathname}`;
    const q = searchParams?.toString();
    if (q) url += `?${q}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}
