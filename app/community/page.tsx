"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import CommunityHero from "@/components/community/CommunityHero";
import ContentTypeFilter from "@/components/community/ContentTypeFilter";
import OTTCard, {
  type CardContentKind,
} from "@/components/community/OTTCard";
import { trendingScore, isNew } from "@/lib/community/trending";

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  content_kind: CardContentKind;
  accepted_reply_id: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
  reply_count: { count: number }[];
  vote_count: { count: number }[];
};

const CATEGORY_LABELS: Record<
  string,
  string
> = {
  general: "General",
  prompt_help: "Prompt Help",
  feedback: "Feedback",
  bug_report: "Bug Report",
  showcase: "Showcase",
};

export default function CommunityHubPage() {
  const [threads, setThreads] = useState<
    ThreadRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [filter, setFilter] =
    useState("all");
  const [memberCount, setMemberCount] =
    useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        threadsResponse,
        membersResponse,
      ] = await Promise.all([
        supabase
          .from("community_threads")
          .select(
            `
              id,
              title,
              body,
              category,
              content_kind,
              accepted_reply_id,
              created_at,
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
          }),
        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          }),
      ]);

      setThreads(
        (threadsResponse.data ||
          []) as unknown as ThreadRow[]
      );

      setMemberCount(
        membersResponse.count || 0
      );

      setLoading(false);
    }

    load();
  }, []);

  const withStats = useMemo(
    () =>
      threads.map((t) => {
        const voteCount =
          t.vote_count?.[0]?.count || 0;
        const replyCount =
          t.reply_count?.[0]?.count || 0;

        return {
          ...t,
          voteCount,
          replyCount,
          score: trendingScore(
            voteCount,
            replyCount,
            t.created_at
          ),
        };
      }),
    [threads]
  );

  const filtered = withStats.filter(
    (t) =>
      filter === "all" ||
      t.content_kind === filter
  );

  const trending = [...filtered]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const fresh = [...filtered]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 6);

  const mostValuable = [...filtered]
    .sort(
      (a, b) => b.voteCount - a.voteCount
    )
    .slice(0, 6);

  const totalAnswers = threads.filter(
    (t) => t.accepted_reply_id
  ).length;

  function renderCard(
    thread: (typeof withStats)[number]
  ) {
    return (
      <OTTCard
        key={thread.id}
        kind={thread.content_kind}
        title={thread.title}
        preview={thread.body}
        authorName={
          thread.profiles
            ?.display_name ||
          thread.profiles?.email ||
          "Community Member"
        }
        category={
          CATEGORY_LABELS[
            thread.category
          ] || thread.category
        }
        voteCount={thread.voteCount}
        replyCount={thread.replyCount}
        createdAt={thread.created_at}
        href={`/discussions/${thread.id}`}
        isAnswered={Boolean(
          thread.accepted_reply_id
        )}
        isTrending={
          thread.score > 0.5 &&
          !isNew(thread.created_at)
        }
        isNew={isNew(thread.created_at)}
      />
    );
  }

  function Section({
    title,
    icon,
    items,
  }: {
    title: string;
    icon: string;
    items: typeof trending;
  }) {
    if (!loading && items.length === 0) {
      return null;
    }

    return (
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          {icon} {title}
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {loading
            ? Array.from({
                length: 2,
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
                />
              ))
            : items.map(renderCard)}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <CommunityHero
          memberCount={memberCount}
          discussionCount={
            threads.length
          }
          answerCount={totalAnswers}
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <ContentTypeFilter
            value={filter}
            onChange={setFilter}
          />

          <div className="flex gap-2">
            <Link
              href="/community/shared-prompts"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Browse Shared Prompts
            </Link>

            <Link
              href="/discussions/new"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              + Create
            </Link>
          </div>
        </div>

        {!loading &&
          filtered.length === 0 && (
            <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
              <p className="text-zinc-400">
                Nothing here yet — be the
                first to post.
              </p>
            </div>
          )}

        <Section
          title="Trending Now"
          icon="🔥"
          items={trending}
        />

        <Section
          title="Fresh Discussions"
          icon="🆕"
          items={fresh}
        />

        <Section
          title="Most Valuable"
          icon="⭐"
          items={mostValuable}
        />
      </div>
    </main>
  );
}
