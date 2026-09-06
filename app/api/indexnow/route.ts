import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo/metadata";

/*
 * This key is meant to be public — it's hosted as a plain text
 * file at the domain root (public/<key>.txt) specifically so
 * search engines can verify it. It is NOT a secret.
 */
const INDEXNOW_KEY = "f3b309da4bc8703ababc40db140df8ba";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: unknown = body?.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No URLs provided." },
        { status: 400 }
      );
    }

    /*
     * This call happens server-side, not in the browser — the
     * whole reason this route exists. IndexNow's endpoint isn't
     * set up to accept direct browser-JS requests (no CORS
     * headers for it), so calling it from a "use client"
     * component always fails with a generic "Failed to fetch",
     * regardless of the key/URLs being correct.
     */
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

    if (response.ok || response.status === 202) {
      return NextResponse.json({
        ok: true,
        message: "Search engines notified (Bing, Yandex, and others).",
      });
    }

    return NextResponse.json({
      ok: false,
      message: `IndexNow responded with status ${response.status}.`,
    });
  } catch (err) {
    console.error("IndexNow API route: request failed:", err);

    return NextResponse.json({
      ok: false,
      message:
        err instanceof Error
          ? `Could not reach IndexNow: ${err.message}`
          : "Could not reach IndexNow.",
    });
  }
}
