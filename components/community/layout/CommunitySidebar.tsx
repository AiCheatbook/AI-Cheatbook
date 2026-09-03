"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Profile = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const NAV_ITEMS = [
  {
    href: "/notebook",
    icon: "📓",
    label: "AI Notebook",
    subtitle: "Build Your Knowledge Vault",
  },
  {
    href: "/generator",
    icon: "✨",
    label: "Prompt Designer",
    subtitle: "Your Interactive Prompt Engine",
  },
  {
    href: "/search",
    icon: "📚",
    label: "Browse Prompt Book",
    subtitle: "Browse Thousands of Proven Prompts",
  },
  {
    href: "/news",
    icon: "📰",
    label: "Stay Ahead with AI",
    subtitle: "Latest AI News, Updates & Trends",
  },
  {
    href: "/",
    icon: "🌐",
    label: "Learn AI with Community",
    subtitle: "Explore, Understand & Master AI",
  },
];

export default function CommunitySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseAuthClient
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(
          "CommunitySidebar: failed to load profile:",
          error.message
        );
      }

      setProfile((data as Profile) || null);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await supabaseAuthClient.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "Guest";

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 lg:block">
      <div className="sticky top-16 space-y-4">
        {loading ? (
          <div className="h-16 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
        ) : profile ? (
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 font-bold text-brand-text">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {displayName}
              </p>
              {profile.email && (
                <p className="truncate text-xs text-zinc-500">
                  {profile.email}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="block rounded-2xl border border-zinc-200 bg-white p-4 text-center text-sm font-semibold text-brand-text transition hover:border-brand/50"
          >
            Log in
          </Link>
        )}

        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  active
                    ? "border-brand bg-brand text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-brand/40"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    active ? "bg-white/30" : "bg-zinc-100"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={`block truncate text-xs ${
                      active ? "text-zinc-900/70" : "text-zinc-500"
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        {profile && (
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}
