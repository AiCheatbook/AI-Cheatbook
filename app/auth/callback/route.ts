import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Behind Hostinger's reverse proxy, the
 * origin derived from the raw incoming
 * request can resolve to the server's
 * internal address (localhost / 0.0.0.0)
 * instead of the real public domain — this
 * is exactly what caused Google login to
 * redirect somewhere unreachable for real
 * visitors. Using the site's known address
 * directly sidesteps that entirely.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://aicheatbook.com"
).replace(/\/$/, "");

export async function GET(
  request: Request
) {
  const { searchParams, origin } = new URL(
    request.url
  );

  const code = searchParams.get("code");

  const redirectTo =
    searchParams.get("redirect") || "/";

  if (code) {
    const supabase = await createClient();

    await supabase.auth.exchangeCodeForSession(
      code
    );
  }

  /*
   * Locally (npm run dev), request.url
   * correctly points to localhost since
   * there's no reverse proxy involved —
   * only override it with the known
   * production URL when actually running
   * in production, where the proxy can
   * mangle it.
   */

  const isProduction =
    process.env.NODE_ENV === "production";

  const safeOrigin = isProduction
    ? SITE_URL
    : origin;

  return NextResponse.redirect(
    `${safeOrigin}${redirectTo}`
  );
}
