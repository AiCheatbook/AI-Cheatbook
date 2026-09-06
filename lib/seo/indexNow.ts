import { SITE_URL } from "@/lib/seo/metadata";

/*
 * This key is meant to be public — it's hosted as a plain text
 * file at the domain root (public/<key>.txt) specifically so
 * search engines can verify it. It is NOT a secret and doesn't
 * need to be an environment variable; the actual protection
 * against abuse is that only your own server can trigger a ping
 * in the first place (this function is only ever called from
 * your own publish flows, not exposed as a public endpoint).
 */
const INDEXNOW_KEY = "f3b309da4bc8703ababc40db140df8ba";

export type IndexNowResult = {
  ok: boolean;
  message: string;
};

/*
 * Pings the IndexNow universal endpoint, which fans out to every
 * participating search engine in one call — Bing, Yandex, Naver,
 * and Seznam (Seznam and Yep/DuckDuckGo's index are reached via
 * the same shared network). Google does NOT participate in
 * IndexNow as of 2026 and never receives this ping — see the
 * conversation this was built from for why that's a deliberate,
 * confirmed limitation, not an oversight.
 */
export async function pingIndexNow(
  urls: string[]
): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { ok: false, message: "No URLs to submit." };
  }

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    /*
     * IndexNow returns 200 or 202 on success. Anything else
     * (including 4xx for a malformed key/host) is a real failure
     * worth surfacing, not swallowing.
     */
    if (response.ok || response.status === 202) {
      return {
        ok: true,
        message: "Search engines notified (Bing, Yandex, and others).",
      };
    }

    return {
      ok: false,
      message: `IndexNow responded with status ${response.status}.`,
    };
  } catch (err) {
    /*
     * Network failure, DNS issue, etc. Never throw from here —
     * a failed indexing ping should never block or break the
     * actual publish action, which already succeeded by the
     * time this runs.
     */
    console.error("pingIndexNow: request failed:", err);

    return {
      ok: false,
      message:
        err instanceof Error
          ? `Could not reach IndexNow: ${err.message}`
          : "Could not reach IndexNow.",
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
