import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * Server-side Supabase client.
 *
 * Use this inside Route Handlers (app/api/.../route.ts)
 * and Server Components that need to know who is
 * currently logged in.
 */

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(
                  name,
                  value,
                  options
                )
            );
          } catch {
            /*
             * Called from a Server Component
             * without a way to set cookies.
             * Safe to ignore since proxy.ts
             * already refreshes sessions.
             */
          }
        },
      },
    }
  );
}
