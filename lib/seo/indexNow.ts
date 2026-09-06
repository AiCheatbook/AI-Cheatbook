import { SITE_URL } from "@/lib/seo/metadata";

export type IndexNowResult = {
  ok: boolean;
  message: string;
};

/*
 * Pings IndexNow, which fans out to every participating search
 * engine in one call — Bing, Yandex, Naver, and Seznam. Google
 * does NOT participate in IndexNow as of 2026 and never receives
 * this ping — a deliberate, confirmed limitation, not an
 * oversight.
 *
 * This calls OUR OWN /api/indexnow route rather than
 * api.indexnow.org directly. The direct-call version failed with
 * "Failed to fetch" for every caller, because every caller here
 * is a "use client" component — meaning the fetch ran in the
 * browser, and IndexNow's endpoint isn't set up to accept
 * requests from arbitrary browser JavaScript (no CORS headers
 * for it). Routing through our own server-side API endpoint
 * avoids that entirely — the browser talks to our own server
 * (same-origin, no CORS issue), and our server is the one that
 * actually calls IndexNow.
 */
export async function pingIndexNow(
  urls: string[]
): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { ok: false, message: "No URLs to submit." };
  }

  try {
    const response = await fetch("/api/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    const data = await response.json();
    return {
      ok: Boolean(data.ok),
      message: data.message || "Unknown response from IndexNow.",
    };
  } catch (err) {
    /*
     * Never throw from here — a failed indexing ping should
     * never block or break the actual publish action, which
     * already succeeded by the time this runs.
     */
    console.error("pingIndexNow: request failed:", err);

    return {
      ok: false,
      message:
        err instanceof Error
          ? `Could not reach the indexing service: ${err.message}`
          : "Could not reach the indexing service.",
    };
  }
}

export function buildLiveUrl(
  path: string
): string {
  return `${SITE_URL}${path}`;
}

/*
 * Reads the ?indexnow=ok|fail param a "new article" page's
 * redirect leaves behind, for use as a useState lazy initializer
 * (runs once on first render, safe for browser-only APIs like
 * window — unlike calling setState from inside a useEffect body,
 * which triggers an avoidable extra render).
 */
export function readIndexNowParam(): "ok" | "fail" | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const value = params.get("indexnow");

  return value === "ok" || value === "fail" ? value : null;
}

/*
 * Strips the ?indexnow= param from the URL bar without a
 * navigation/reload, so refreshing the page doesn't re-show the
 * banner. Call from a useEffect — this only touches
 * window.history, no state updates, so it doesn't trigger the
 * same effect-purity concern as setting state from an effect.
 */
export function cleanIndexNowParam(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (!params.has("indexnow")) return;

  params.delete("indexnow");
  const cleanQuery = params.toString();
  window.history.replaceState(
    {},
    "",
    window.location.pathname + (cleanQuery ? `?${cleanQuery}` : "")
  );
}
