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

type FeedItem = {
  id: string;
  kind: CardContentKind;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  voteCount: number;
  replyCount: number;
  createdAt: string;
  href: string;
  isAnswered: boolean;
  score: number;
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
  const [items, setItems] = useState<
    FeedItem[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [filter, setFilter] =
    useState("all");
  const [memberCount, setMemberCount] =
    useState(0);
  const [answerCount, setAnswerCount] =
    useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        threadsResponse,
        pollsResponse,
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
              profiles ( display_name, email ),
              reply_count:community_replies(count),
              vote_count:community_thread_votes(count)
            `
          )
          .order("created_at", {
            ascending: false,
          }),
        supabase
          .from("community_polls")
          .select(
            `
              id,
              question,
              description,
              category,
              created_at,
              profiles ( display_name, email ),
              vote_count:community_poll_votes(count)
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

      const threadItems: FeedItem[] = (
        (threadsResponse.data ||
          []) as unknown as Array<{
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
        }>
      ).map((t) => {
        const voteCount =
          t.vote_count?.[0]?.count || 0;
        const replyCount =
          t.reply_count?.[0]?.count || 0;

        return {
          id: t.id,
          kind: t.content_kind,
          title: t.title,
          preview: t.body,
          authorName:
            t.profiles?.display_name ||
            t.profiles?.email ||
            "Community Member",
          category:
            CATEGORY_LABELS[
              t.category
            ] || t.category,
          voteCount,
          replyCount,
          createdAt: t.created_at,
          href: `/discussions/${t.id}`,
          isAnswered: Boolean(
            t.accepted_reply_id
          ),
          score: trendingScore(
            voteCount,
            replyCount,
            t.created_at
          ),
        };
      });

      const pollItems: FeedItem[] = (
        (pollsResponse.data ||
          []) as unknown as Array<{
          id: string;
          question: string;
          description: string | null;
          category: string;
          created_at: string;
          profiles: {
            display_name: string | null;
            email: string | null;
          } | null;
          vote_count: { count: number }[];
        }>
      ).map((p) => {
        const voteCount =
          p.vote_count?.[0]?.count || 0;

        return {
          id: p.id,
          kind: "poll" as const,
          title: p.question,
          preview: p.description || "",
          authorName:
            p.profiles?.display_name ||
            p.profiles?.email ||
            "Community Member",
          category:
            CATEGORY_LABELS[
              p.category
            ] || p.category,
          voteCount,
          replyCount: 0,
          createdAt: p.created_at,
          href: `/community/polls/${p.id}`,
          isAnswered: false,
          score: trendingScore(
            voteCount,
            0,
            p.created_at
          ),
        };
      });

      const combined = [
        ...threadItems,
        ...pollItems,
      ];

      setItems(combined);

      setAnswerCount(
        threadItems.filter(
          (t) => t.isAnswered
        ).length
      );

      setMemberCount(
        membersResponse.count || 0
      );

      setLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === "all" ||
          item.kind === filter
      ),
    [items, filter]
  );

  const trending = [...filtered]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const fresh = [...filtered]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const mostValuable = [...filtered]
    .sort(
      (a, b) => b.voteCount - a.voteCount
    )
    .slice(0, 6);

  function renderCard(item: FeedItem) {
    return (
      <OTTCard
        key={`${item.kind}-${item.id}`}
        kind={item.kind}
        title={item.title}
        preview={item.preview}
        authorName={item.authorName}
        category={item.category}
        voteCount={item.voteCount}
        replyCount={item.replyCount}
        createdAt={item.createdAt}
        href={item.href}
        isAnswered={item.isAnswered}
        isTrending={
          item.score > 0.5 &&
          !isNew(item.createdAt)
        }
        isNew={isNew(item.createdAt)}
      />
    );
  }

  function Section({
    title,
    icon,
    entries,
  }: {
    title: string;
    icon: string;
    entries: FeedItem[];
  }) {
    if (!loading && entries.length === 0) {
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
            : entries.map(renderCard)}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <CommunityHero
          memberCount={memberCount}
          discussionCount={items.length}
          answerCount={answerCount}
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
          entries={trending}
        />

        <Section
          title="Fresh Discussions"
          icon="🆕"
          entries={fresh}
        />

        <Section
          title="Most Valuable"
          icon="⭐"
          entries={mostValuable}
        />
      </div>
    </main>
  );
}
