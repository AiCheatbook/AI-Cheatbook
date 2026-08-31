"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type ThreadRow = {
  id: string;
  title: string;
  category: string;
  accepted_reply_id: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
  reply_count: { count: number }[];
  vote_count: { count: number }[];
};

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  {
    value: "prompt_help",
    label: "Prompt Help",
  },
  {
    value: "feedback",
    label: "Feedback",
  },
  {
    value: "bug_report",
    label: "Bug Report",
  },
  {
    value: "showcase",
    label: "Showcase",
  },
];

export default function DiscussionsPage() {
  const [threads, setThreads] = useState<
    ThreadRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [category, setCategory] =
    useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);

      let query = supabase
        .from("community_threads")
        .select(
          `
            id,
            title,
            category,
            accepted_reply_id,
            created_at,
            user_id,
            profiles (
              display_name,
              email
            ),
            reply_count:community_replies(count),
            vote_count:community_thread_votes(count)
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (category !== "all") {
        query = query.eq(
          "category",
          category
        );
      }

      const { data } = await query;

      setThreads(
        (data || []) as unknown as ThreadRow[]
      );
      setLoading(false);
    }

    load();
  }, [category]);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Discussions
            </h1>
            <p className="mt-1 text-zinc-400">
              Ask questions, share
              feedback, and talk with the
              community.
            </p>
          </div>

          <Link
            href="/discussions/new"
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            + New Discussion
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() =>
                setCategory(c.value)
              }
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                category === c.value
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 4,
            }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            ))}
          </div>
        )}

        {!loading &&
          threads.length === 0 && (
            <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="text-zinc-400">
                No discussions yet — be
                the first to start one.
              </p>
            </div>
          )}

        {!loading &&
          threads.length > 0 && (
            <div className="mt-6 space-y-3">
              {threads.map((thread) => {
                const authorName =
                  thread.profiles
                    ?.display_name ||
                  thread.profiles
                    ?.email ||
                  "Community Member";

                const replyCount =
                  thread.reply_count?.[0]
                    ?.count || 0;

                const voteCount =
                  thread.vote_count?.[0]
                    ?.count || 0;

                return (
                  <Link
                    key={thread.id}
                    href={`/discussions/${thread.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-orange-500/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {thread.accepted_reply_id && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                            ✓ Answered
                          </span>
                        )}

                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {
                            CATEGORIES.find(
                              (c) =>
                                c.value ===
                                thread.category
                            )?.label
                          }
                        </span>
                      </div>

                      <h2 className="mt-1.5 truncate font-medium text-white">
                        {thread.title}
                      </h2>

                      <p className="mt-1 text-xs text-zinc-500">
                        {authorName} ·{" "}
                        {new Date(
                          thread.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-4 text-center text-xs text-zinc-500">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {voteCount}
                        </p>
                        votes
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">
                          {replyCount}
                        </p>
                        replies
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </main>
  );
}
