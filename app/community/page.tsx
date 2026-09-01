"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import CommunityLayout from "@/components/community/layout/CommunityLayout";
import CommunityHero from "@/components/community/CommunityHero";
import ContentTypeFilter from "@/components/community/ContentTypeFilter";
import DiscussionCard from "@/components/community/cards/DiscussionCard";
import QuestionCard from "@/components/community/cards/QuestionCard";
import PollCard from "@/components/community/cards/PollCard";
import PromptPostCard from "@/components/community/cards/PromptPostCard";
import LearningPostCard from "@/components/community/cards/LearningPostCard";
import ResourcePostCard from "@/components/community/cards/ResourcePostCard";
import PostComposer from "@/components/community/PostComposer";
import { trendingScore } from "@/lib/community/trending";

type ContentKind =
  | "question"
  | "discussion"
  | "discovery"
  | "poll"
  | "prompt"
  | "learning"
  | "resource";

type FeedItem = {
  id: string;
  kind: ContentKind;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  voteCount: number;
  replyCount: number;
  createdAt: string;
  isAnswered: boolean;
  score: number;
  aiTool: string | null;
  resourceUrl: string | null;
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
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);
  const [composerOpen, setComposerOpen] =
    useState(false);

  async function loadFeed() {
    setLoading(true);

    /*
     * Fetch threads/polls without
     * embedded nested-count syntax —
     * that pattern failed silently in
     * production (likely an RLS
     * interaction on the embedded
     * sub-select), so counts are now
     * fetched as flat lists and tallied
     * client-side instead, matching the
     * pattern already proven to work on
     * the thread detail page. Every
     * query's error is now explicitly
     * checked and logged instead of
     * being silently swallowed.
     */

    const [
      threadsResponse,
      pollsResponse,
      threadVotesResponse,
      repliesResponse,
      pollVotesResponse,
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
            ai_tool,
            resource_url,
            created_at,
            profiles ( display_name, email )
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
            profiles ( display_name, email )
          `
        )
        .order("created_at", {
          ascending: false,
        }),
      supabase
        .from("community_thread_votes")
        .select("thread_id"),
      supabase
        .from("community_replies")
        .select("thread_id"),
      supabase
        .from("community_poll_votes")
        .select("poll_id"),
      supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        }),
    ]);

    if (threadsResponse.error) {
      console.error(
        "Failed to load community threads:",
        threadsResponse.error.message
      );
    }

    if (pollsResponse.error) {
      console.error(
        "Failed to load community polls:",
        pollsResponse.error.message
      );
    }

    if (threadVotesResponse.error) {
      console.error(
        "Failed to load thread votes:",
        threadVotesResponse.error.message
      );
    }

    if (repliesResponse.error) {
      console.error(
        "Failed to load replies:",
        repliesResponse.error.message
      );
    }

    if (pollVotesResponse.error) {
      console.error(
        "Failed to load poll votes:",
        pollVotesResponse.error.message
      );
    }

    const threadVoteCounts: Record<
      string,
      number
    > = {};

    for (const row of threadVotesResponse.data ||
      []) {
      threadVoteCounts[row.thread_id] =
        (threadVoteCounts[
          row.thread_id
        ] || 0) + 1;
    }

    const replyCounts: Record<
      string,
      number
    > = {};

    for (const row of repliesResponse.data ||
      []) {
      replyCounts[row.thread_id] =
        (replyCounts[row.thread_id] ||
          0) + 1;
    }

    const pollVoteCounts: Record<
      string,
      number
    > = {};

    for (const row of pollVotesResponse.data ||
      []) {
      pollVoteCounts[row.poll_id] =
        (pollVoteCounts[row.poll_id] ||
          0) + 1;
    }

    const threadItems: FeedItem[] = (
      (threadsResponse.data ||
        []) as unknown as Array<{
        id: string;
        title: string;
        body: string;
        category: string;
        content_kind: ContentKind;
        accepted_reply_id: string | null;
        ai_tool: string | null;
        resource_url: string | null;
        created_at: string;
        profiles: {
          display_name: string | null;
          email: string | null;
        } | null;
      }>
    ).map((t) => {
      const voteCount =
        threadVoteCounts[t.id] || 0;
      const replyCount =
        replyCounts[t.id] || 0;

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
          CATEGORY_LABELS[t.category] ||
          t.category,
        voteCount,
        replyCount,
        createdAt: t.created_at,
        isAnswered: Boolean(
          t.accepted_reply_id
        ),
        aiTool: t.ai_tool,
        resourceUrl: t.resource_url,
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
      }>
    ).map((p) => {
      const voteCount =
        pollVoteCounts[p.id] || 0;

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
          CATEGORY_LABELS[p.category] ||
          p.category,
        voteCount,
        replyCount: 0,
        createdAt: p.created_at,
        isAnswered: false,
        aiTool: null,
        resourceUrl: null,
        score: trendingScore(
          voteCount,
          0,
          p.created_at
        ),
      };
    });

    setItems([
      ...threadItems,
      ...pollItems,
    ]);

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

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      setIsLoggedIn(Boolean(user));

      await loadFeed();
    }

    init();
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

  const sorted = [...filtered].sort(
    (a, b) => b.score - a.score
  );

  function renderCard(item: FeedItem) {
    if (item.kind === "poll") {
      return (
        <PollCard
          key={`poll-${item.id}`}
          id={item.id}
          question={item.title}
          authorName={item.authorName}
          category={item.category}
          voteCount={item.voteCount}
          createdAt={item.createdAt}
        />
      );
    }

    if (item.kind === "question") {
      return (
        <QuestionCard
          key={`question-${item.id}`}
          id={item.id}
          title={item.title}
          preview={item.preview}
          authorName={item.authorName}
          category={item.category}
          replyCount={item.replyCount}
          voteCount={item.voteCount}
          createdAt={item.createdAt}
          isAnswered={item.isAnswered}
        />
      );
    }

    if (item.kind === "prompt") {
      return (
        <PromptPostCard
          key={`prompt-${item.id}`}
          id={item.id}
          title={item.title}
          promptText={item.preview}
          authorName={item.authorName}
          category={item.category}
          aiTool={item.aiTool}
          voteCount={item.voteCount}
          replyCount={item.replyCount}
          createdAt={item.createdAt}
        />
      );
    }

    if (item.kind === "learning") {
      return (
        <LearningPostCard
          key={`learning-${item.id}`}
          id={item.id}
          title={item.title}
          preview={item.preview}
          authorName={item.authorName}
          category={item.category}
          replyCount={item.replyCount}
          voteCount={item.voteCount}
          createdAt={item.createdAt}
        />
      );
    }

    if (item.kind === "resource") {
      return (
        <ResourcePostCard
          key={`resource-${item.id}`}
          id={item.id}
          title={item.title}
          preview={item.preview}
          authorName={item.authorName}
          category={item.category}
          resourceUrl={item.resourceUrl}
          voteCount={item.voteCount}
          replyCount={item.replyCount}
        />
      );
    }

    return (
      <DiscussionCard
        key={`discussion-${item.id}`}
        id={item.id}
        title={item.title}
        preview={item.preview}
        authorName={item.authorName}
        category={item.category}
        replyCount={item.replyCount}
        voteCount={item.voteCount}
        createdAt={item.createdAt}
      />
    );
  }

  return (
    <CommunityLayout>
      <CommunityHero
        memberCount={memberCount}
        discussionCount={items.length}
        answerCount={answerCount}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <ContentTypeFilter
          value={filter}
          onChange={setFilter}
        />

        <div className="flex gap-2">
          <Link
            href="/community/shared-prompts"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Shared Prompts
          </Link>

          <button
            type="button"
            onClick={() =>
              setComposerOpen(true)
            }
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            + Create
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading &&
          Array.from({ length: 4 }).map(
            (_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            )
          )}

        {!loading &&
          sorted.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
              <p className="text-zinc-400">
                Nothing here yet — be the
                first to post.
              </p>
            </div>
          )}

        {!loading &&
          sorted.map(renderCard)}
      </div>

      {composerOpen && (
        <PostComposer
          isLoggedIn={isLoggedIn}
          onClose={() =>
            setComposerOpen(false)
          }
        />
      )}
    </CommunityLayout>
  );
}
