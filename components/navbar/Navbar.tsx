"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import NavbarSearch from "./NavbarSearch";
import NotificationBell from "./NotificationBell";

type Profile = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

/*
 * Light header with one tab row under it, which replaces
 * the old left sidebar, so every section is one click away on
 * every page (and scrolls sideways on small screens).
 */
// "match" lists extra path prefixes that highlight the tab: the
// Communities tab covers the Skool-style feed (/community) and the
// individual community pages (/groups/...).
const TABS: { href: string; label: string; match?: string[] }[] = [
  { href: "/", label: "Home" },
  {
    href: "/community",
    label: "Communities",
    match: ["/groups"],
  },
  { href: "/prompts", label: "Prompt Book" },
  { href: "/generator", label: "Prompt Designer" },
  { href: "/learning", label: "Learning" },
  { href: "/news", label: "AI News" },
  { href: "/notebook", label: "Notebook" },
];

function isActive(pathname: string, tab: (typeof TABS)[number]) {
  if (tab.href === "/") {
    return pathname === "/";
  }

  return [tab.href, ...(tab.match || [])].some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function loadProfile(userId: string | null) {
      setLoggedIn(Boolean(userId));

      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabaseAuthClient
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error(
          "Navbar: failed to load profile:",
          error.message
        );
      }

      setProfile((data as Profile) || null);
    }

    supabaseAuthClient.auth
      .getUser()
      .then(({ data }) => loadProfile(data.user?.id || null));

    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange(
      (_event, session) => {
        loadProfile(session?.user?.id || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  function handleLogoClick(
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
    // If already on homepage, scroll smoothly to the top
    if (window.location.pathname === "/") {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 text-zinc-900 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex h-16 items-center gap-4">
          {/* Logo */}

          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-white">
              AI
            </span>
            <span className="hidden text-lg font-bold sm:inline">
              AI Cheatbook
            </span>
          </Link>

          {/* Search */}

          <div className="min-w-0 flex-1">
            <NavbarSearch />
          </div>

          {/* Actions */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/groups/new"
              aria-label="Create your own AI community"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden lg:inline">
                Create your Own AI Community
              </span>
              <span className="hidden md:inline lg:hidden">
                Create Community
              </span>
            </Link>

            <NotificationBell />

            <Link
              href={loggedIn ? "/account" : "/login"}
              aria-label={loggedIn ? "My account" : "Log in"}
              title={loggedIn ? displayName || "My account" : "Log in"}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-600 transition hover:ring-2 hover:ring-brand/40"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : loggedIn && displayName ? (
                <span className="font-bold text-brand-text">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <UserRound className="h-5 w-5" strokeWidth={1.75} />
              )}
            </Link>
          </div>
        </div>

        {/* Tabs */}

        <nav className="-mb-px flex gap-6 overflow-x-auto text-[15px] [scrollbar-width:none] sm:gap-8">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 whitespace-nowrap border-b-4 pb-3 pt-1 transition ${
                  active
                    ? "border-brand font-semibold text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
