"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import RotatingPollWidget from "@/components/community/widgets/RotatingPollWidget";
import RotatingQuestionWidget from "@/components/community/widgets/RotatingQuestionWidget";

type Contributor = {
  id: string;
  display_name: string | null;
  email: string | null;
  postCount: number;
};

type Stats = {
  posts: number;
  questions: number;
  members: number;
  learningCards: number;
};

export default function CommunityRightSidebar() {
  const [contributors, setContributors] =
    useState<Contributor[]>([]);
  const [stats, setStats] =
    useState<Stats | null>(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const [
        threadsResponse,
        membersResponse,
        learningResponse,
      ] = await Promise.all([
        supabase
          .from("community_threads")
          .select(
            "user_id, content_kind, profiles(display_name, email)"
          ),
        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          }),
        supabase
          .from("learning_cards")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("is_published", true),
      ]);

      const threads =
        (threadsResponse.data ||
          []) as unknown as {
          user_id: string;
          content_kind: string;
          profiles: {
            display_name: string | null;
            email: string | null;
          } | null;
        }[];

      const byUser = new Map<
        string,
        Contributor
      >();

      for (const t of threads) {
        const existing = byUser.get(
          t.user_id
        );

        if (existing) {
          existing.postCount += 1;
        } else {
          byUser.set(t.user_id, {
            id: t.user_id,
            display_name:
              t.profiles
                ?.display_name || null,
            email:
              t.profiles?.email ||
              null,
            postCount: 1,
          });
        }
      }

      const topContributors = Array.from(
        byUser.values()
      )
        .sort(
          (a, b) =>
            b.postCount - a.postCount
        )
        .slice(0, 5);

      setContributors(topContributors);

      setStats({
        posts: threads.length,
        questions: threads.filter(
          (t) =>
            t.content_kind ===
            "question"
        ).length,
        members:
          membersResponse.count || 0,
        learningCards:
          learningResponse.count || 0,
      });

      setLoading(false);
    }

    load();
  }, []);

  const rankStyles = [
    "bg-amber-400 text-white",
    "bg-zinc-400 text-white",
    "bg-orange-400 text-white",
  ];

  return (
    <aside className="hidden w-[300px] shrink-0 lg:block">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex h-36 items-center justify-center bg-zinc-900 px-6">
            <p className="text-center text-3xl font-extrabold leading-tight tracking-tight text-white">
              AI <span className="text-brand">CHEAT</span>BOOK
            </p>
          </div>

          <div className="p-5">
            <h3 className="text-lg font-semibold text-zinc-900">
              AI Cheatbook
            </h3>
            <p className="text-sm font-medium text-zinc-500">
              aicheatbook.com
            </p>

            <p className="mt-3 text-[15px] leading-relaxed text-zinc-700">
              Join AI creator communities, discover powerful
              prompts, and learn AI through practical guides
              and the latest news.
            </p>

            {loading ? (
              <div className="mt-4 h-14 animate-pulse rounded-lg bg-zinc-100" />
            ) : (
              <dl className="mt-4 grid grid-cols-3 divide-x divide-zinc-200 border-y border-zinc-200 py-3 text-center">
                <div>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {stats?.members || 0}
                  </dd>
                  <dt className="text-xs text-zinc-500">
                    Members
                  </dt>
                </div>
                <div>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {stats?.posts || 0}
                  </dd>
                  <dt className="text-xs text-zinc-500">
                    Posts
                  </dt>
                </div>
                <div>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {stats?.learningCards || 0}
                  </dd>
                  <dt className="text-xs text-zinc-500">
                    Learning
                  </dt>
                </div>
              </dl>
            )}

            <Link
              href="/groups"
              className="mt-4 block rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-50"
            >
              Explore Communities
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900">
            Leaderboard
          </h3>

          {loading && (
            <div className="mt-3 space-y-2">
              {Array.from({
                length: 3,
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 animate-pulse rounded-lg bg-zinc-100"
                />
              ))}
            </div>
          )}

          {!loading &&
            contributors.length ===
              0 && (
              <p className="mt-2 text-sm text-zinc-500">
                Great conversations
                will surface top
                contributors here as
                the community grows.
              </p>
            )}

          {!loading &&
            contributors.length > 0 && (
              <ol className="mt-4 space-y-3">
                {contributors.map(
                  (c, index) => {
                    const name =
                      c.display_name ||
                      c.email ||
                      "Community Member";

                    return (
                      <li key={c.id}>
                        <Link
                          href={`/community/user/${c.id}`}
                          className="flex items-center gap-3 text-sm hover:text-brand-text"
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              rankStyles[index] ||
                              "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 font-bold text-brand-text">
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-zinc-800">
                            {name}
                          </span>
                          <span className="shrink-0 font-semibold text-brand-text">
                            +{c.postCount}
                          </span>
                        </Link>
                      </li>
                    );
                  }
                )}
              </ol>
            )}
        </div>

        <RotatingPollWidget />
        <RotatingQuestionWidget />
      </div>
    </aside>
  );
}
