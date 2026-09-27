import { createServerClient } from "@supabase/ssr";
import { canOpenAdminPath, isStaffRole } from "@/lib/auth/roles";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

/*
 * Runs before /admin pages load.
 *
 * Not logged in + trying to open an admin
 * page → redirect to /admin/login.
 *
 * This only ever runs for /admin/* paths
 * (see matcher below) — it never touches
 * your public pages (Homepage, Library,
 * News, Community, etc.).
 */

export async function proxy(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              response.cookies.set(
                name,
                value,
                options
              )
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    role = profile?.role ?? null;
  }

  // Admins and moderators may use the admin area; moderators are
  // kept out of the admin-only pages (see lib/auth/roles.ts).
  const isStaff = isStaffRole(role);

  const isLoginPage =
    request.nextUrl.pathname ===
    "/admin/login";

  const isAdminRoute =
    request.nextUrl.pathname.startsWith(
      "/admin"
    );

  /*
   * Not staff (either not logged in at
   * all, or logged in as a regular
   * registered user) → send to login.
   */

  if (
    isAdminRoute &&
    !isLoginPage &&
    !isStaff
  ) {
    return NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
  }

  if (
    isAdminRoute &&
    !isLoginPage &&
    !canOpenAdminPath(role, request.nextUrl.pathname)
  ) {
    return NextResponse.redirect(
      new URL("/admin", request.url)
    );
  }

  if (isLoginPage && isStaff) {
    return NextResponse.redirect(
      new URL("/admin/news", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
