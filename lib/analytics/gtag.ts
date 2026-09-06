export const GA_MEASUREMENT_ID = "G-LX354FN1RH";

type GtagFn = (...args: unknown[]) => void;

/*
 * Manually fires a GA4 page_view event. Needed because the
 * standard gtag.js snippet only auto-fires a page_view on the
 * very first (full) page load — Next.js App Router navigates
 * client-side after that, so without this, GA4 would only ever
 * see one pageview per visit no matter how many pages someone
 * actually browses.
 */
export function gtagPageview(url: string): void {
  if (typeof window === "undefined") return;

  const win = window as typeof window & { gtag?: GtagFn };
  if (typeof win.gtag !== "function") return;

  win.gtag("event", "page_view", {
    page_path: url,
  });
}
