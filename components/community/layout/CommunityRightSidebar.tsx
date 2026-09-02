"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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

  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-20 space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Community Stats
          </h3>

          {loading ? (
            <div className="mt-3 h-16 animate-pulse rounded-lg bg-zinc-100" />
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <dt className="text-xs text-zinc-600">
                  Posts
                </dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {stats?.posts || 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">
                  Questions
                </dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {stats?.questions ||
                    0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">
                  Members
                </dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {stats?.members || 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">
                  Learning Cards
                </dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {stats?.learningCards ||
                    0}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            Top Contributors
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
              <p className="mt-2 text-xs text-zinc-600">
                Great conversations
                will surface top
                contributors here as
                the community grows.
              </p>
            )}

          {!loading &&
            contributors.length > 0 && (
              <ul className="mt-3 space-y-2.5">
                {contributors.map(
                  (c) => (
                    <li key={c.id}>
                      <Link
                        href={`/community/user/${c.id}`}
                        className="flex items-center justify-between text-sm hover:text-brand"
                      >
                        <span className="truncate text-zinc-600">
                          {c.display_name ||
                            c.email ||
                            "Community Member"}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-600">
                          {c.postCount}{" "}
                          posts
                        </span>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
        </div>

        <Link
          href="/notebook"
          className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-brand/50"
        >
          <h3 className="text-sm font-semibold text-zinc-900">
            📓 Your AI Notebook
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            Save posts, prompts, and
            learning cards you want to
            come back to.
          </p>
        </Link>
      </div>
    </aside>
  );
}
