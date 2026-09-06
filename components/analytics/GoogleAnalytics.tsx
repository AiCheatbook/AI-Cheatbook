"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, gtagPageview } from "@/lib/analytics/gtag";

function GAPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    gtagPageview(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  return null;
}

/*
 * Mount this ONCE, globally, in the root layout — not per-page.
 * Mounting it more than once would load gtag.js twice and fire
 * duplicate pageviews for every navigation.
 *
 * send_page_view is explicitly disabled in the config call below
 * because GAPageviewTracker fires page_view manually on every
 * route change (initial load included, via its mount-time
 * effect) — leaving GA4's automatic pageview enabled too would
 * double-count that very first page view.
 */
export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          window.gtag = gtag;
        `}
      </Script>
      <Suspense fallback={null}>
        <GAPageviewTracker />
      </Suspense>
    </>
  );
}
