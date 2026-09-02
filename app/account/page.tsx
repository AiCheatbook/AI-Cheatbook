"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Profile = {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  real_ai_used_today: number;
  real_ai_usage_date: string;
};

const REGISTERED_DAILY_LIMIT = 50;

export default function AccountPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/account");
        return;
      }

      const { data, error } =
        await supabaseAuthClient
          .from("profiles")
          .select(
            `
              email,
              display_name,
              avatar_url,
              real_ai_used_today,
              real_ai_usage_date
            `
          )
          .eq("id", user.id)
          .single();

      if (error) {
        setError(
          [
            "PROFILE LOAD FAILED",
            `Code: ${error.code || "unknown"}`,
            `Message: ${error.message || "Unknown error"}`,
            `Details: ${error.details || "none"}`,
            `Hint: ${error.hint || "none"}`,
          ].join("\n")
        );
        setLoading(false);
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    await supabaseAuthClient.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-md">
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-900/50 bg-white p-6">
            <h1 className="font-semibold text-red-400">
              Unable to load your account
            </h1>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  /*
   * Usage resets daily — if the stored
   * date isn't today, they haven't used
   * any yet today.
   */

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const usedToday =
    profile.real_ai_usage_date === today
      ? profile.real_ai_used_today
      : 0;

  const remaining = Math.max(
    0,
    REGISTERED_DAILY_LIMIT - usedToday
  );

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="mx-auto h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 text-2xl font-bold text-brand">
              {(
                profile.display_name ||
                profile.email ||
                "?"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <h1 className="mt-4 text-xl font-bold">
            {profile.display_name ||
              "Your Account"}
          </h1>

          <p className="mt-1 text-sm text-zinc-600">
            {profile.email}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            Real AI Usage Today
          </p>

          <p className="mt-2 text-3xl font-bold">
            {remaining}{" "}
            <span className="text-lg font-normal text-zinc-600">
              / {REGISTERED_DAILY_LIMIT}{" "}
              remaining
            </span>
          </p>

          <p className="mt-2 text-sm text-zinc-600">
            Resets every day at midnight.
          </p>
        </div>

        <Link
          href="/account/saved-prompts"
          className="mt-4 block w-full rounded-full border border-zinc-200 py-3 text-center text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          My Prompts
        </Link>

        <Link
          href="/account/submissions"
          className="mt-3 block w-full rounded-full border border-zinc-200 py-3 text-center text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          My Submissions
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-full border border-zinc-200 py-3 text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
