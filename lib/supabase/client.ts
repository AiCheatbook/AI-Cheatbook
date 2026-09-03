import { createClient } from "@supabase/supabase-js";

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

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    /*
     * Two separate Supabase clients exist
     * in this project by design (see
     * lib/supabase/auth-client.ts). Without
     * a distinct storage key, both silently
     * share the same localStorage auth
     * session key, which is exactly what
     * triggers Supabase's own "Multiple
     * GoTrueClient instances" warning —
     * seen repeatedly in the browser
     * console. Giving each client its own
     * key removes the ambiguity without
     * merging the two clients.
     */
    auth: {
      storageKey: "sb-public-auth",
    },
  }
);