import { createBrowserClient } from "@supabase/ssr";

/*
 * This is a SEPARATE Supabase client, used only
 * for admin login/logout.
 *
 * It exists so the admin login system never
 * touches lib/supabase/client.ts, which the
 * rest of the site (Trending Prompts, Library,
 * Categories, etc.) already relies on.
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

export const supabaseAuthClient =
  createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  );
