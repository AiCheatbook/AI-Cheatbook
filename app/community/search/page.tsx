"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CommunityLayout from "@/components/community/layout/CommunityLayout";
import DiscussionCard from "@/components/community/cards/DiscussionCard";
import QuestionCard from "@/components/community/cards/QuestionCard";
import PollCard from "@/components/community/cards/PollCard";
import PromptPostCard from "@/components/community/cards/PromptPostCard";
import LearningPostCard from "@/components/community/cards/LearningPostCard";
import ResourcePostCard from "@/components/community/cards/ResourcePostCard";

type ContentKind =
  | "question"
  | "discussion"
  | "discovery"
  | "poll"
  | "prompt"
  | "learning"
  | "resource";

type SearchResult = {
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

export default function CommunitySearchPage() {
  return (
    <Suspense fallback={null}>
      <CommunitySearchContent />
    </Suspense>
  );
}

function CommunitySearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery =
    searchParams.get("q") || "";

  const [query, setQuery] =
    useState(initialQuery);
  const [results, setResults] = useState<
    SearchResult[]
  >([]);
  const [loading, setLoading] =
    useState(false);
  const [searched, setSearched] =
    useState(false);

  async function runSearch(
    searchTerm: string
  ) {
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const [
      threadsResponse,
      pollsResponse,
    ] = await Promise.all([
      supabase
        .from("community_threads")
        .select(
          `
            id, title, body, category,
            content_kind, accepted_reply_id,
            ai_tool, resource_url, created_at,
            profiles ( display_name, email )
          `
        )
        .or(
          `title.ilike.%${trimmed}%,body.ilike.%${trimmed}%`
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(30),
      supabase
        .from("community_polls")
        .select(
          `
            id, question, description,
            category, created_at,
            profiles ( display_name, email )
          `
        )
        .or(
          `question.ilike.%${trimmed}%,description.ilike.%${trimmed}%`
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(30),
    ]);

    const threadResults: SearchResult[] = (
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
    ).map((t) => ({
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
      voteCount: 0,
      replyCount: 0,
      createdAt: t.created_at,
      isAnswered: Boolean(
        t.accepted_reply_id
      ),
      aiTool: t.ai_tool,
      resourceUrl: t.resource_url,
    }));

    const pollResults: SearchResult[] = (
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
    ).map((p) => ({
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
      voteCount: 0,
      replyCount: 0,
      createdAt: p.created_at,
      isAnswered: false,
      aiTool: null,
      resourceUrl: null,
    }));

    setResults([
      ...threadResults,
      ...pollResults,
    ]);
    setLoading(false);
  }

  useEffect(() => {
    if (initialQuery) {
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    router.push(
      `/community/search?q=${encodeURIComponent(query)}`
    );
    runSearch(query);
  }

  function renderCard(item: SearchResult) {
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
      <h1 className="text-2xl font-bold text-white">
        Search Community
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-4"
      >
        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder="Search questions, discussions, prompts, polls..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-orange-500"
        />
      </form>

      <div className="mt-6 space-y-4">
        {loading &&
          Array.from({ length: 3 }).map(
            (_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            )
          )}

        {!loading &&
          searched &&
          results.length === 0 && (
            <p className="text-sm text-zinc-500">
              No results for
              &quot;{initialQuery}&quot;.
            </p>
          )}

        {!loading &&
          !searched && (
            <p className="text-sm text-zinc-500">
              Search across Questions,
              Discussions, Prompts,
              Polls, Learning, and
              Resources.
            </p>
          )}

        {!loading &&
          results.map(renderCard)}
      </div>
    </CommunityLayout>
  );
}
