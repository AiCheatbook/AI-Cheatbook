"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import PollCard from "@/components/community/cards/PollCard";
import QuestionCard from "@/components/community/cards/QuestionCard";

type SubFilter = "all" | "unanswered" | "answered";

type PollRow = {
  id: string;
  question: string;
  category: string;
  created_at: string;
  authorName: string;
  voteCount: number;
};

type QuestionRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  authorName: string;
  voteCount: number;
  replyCount: number;
  accepted_reply_id: string | null;
};

const SUB_FILTERS: { value: SubFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unanswered", label: "Not answered by you" },
  { value: "answered", label: "Answered by you" },
];

export default function PollsQuestionsPanel({
  kind,
}: {
  kind: "poll" | "question";
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [loading, setLoading] = useState(true);

  const [polls, setPolls] = useState<PollRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [myAnsweredIds, setMyAnsweredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      const uid = user?.id || null;
      setUserId(uid);

      if (kind === "poll") {
        const [pollsRes, votesRes, myVotesRes] = await Promise.all([
          supabaseAuthClient
            .from("community_polls")
            .select(
              "id, question, category, created_at, profiles(display_name, email)"
            )
            .eq("is_hidden", false)
            .order("created_at", { ascending: false }),
          supabaseAuthClient
            .from("community_poll_votes")
            .select("poll_id"),
          uid
            ? supabaseAuthClient
                .from("community_poll_votes")
                .select("poll_id")
                .eq("user_id", uid)
            : Promise.resolve({ data: [] as { poll_id: string }[] }),
        ]);

        const voteCounts: Record<string, number> = {};
        for (const v of votesRes.data || []) {
          voteCounts[v.poll_id] = (voteCounts[v.poll_id] || 0) + 1;
        }

        setPolls(
          ((pollsRes.data || []) as unknown as Array<{
            id: string;
            question: string;
            category: string;
            created_at: string;
            profiles: {
              display_name: string | null;
              email: string | null;
            } | null;
          }>).map((p) => ({
            id: p.id,
            question: p.question,
            category: p.category,
            created_at: p.created_at,
            authorName:
              p.profiles?.display_name ||
              p.profiles?.email ||
              "Community Member",
            voteCount: voteCounts[p.id] || 0,
          }))
        );

        setMyAnsweredIds(
          new Set((myVotesRes.data || []).map((v) => v.poll_id))
        );
      } else {
        const [threadsRes, votesRes, repliesRes, myRepliesRes] =
          await Promise.all([
            supabaseAuthClient
              .from("community_threads")
              .select(
                "id, title, body, category, created_at, accepted_reply_id, profiles(display_name, email)"
              )
              .eq("content_kind", "question")
              .eq("is_hidden", false)
              .is("deleted_at", null)
              .order("created_at", { ascending: false }),
            supabaseAuthClient
              .from("community_thread_votes")
              .select("thread_id"),
            supabaseAuthClient
              .from("community_replies")
              .select("thread_id"),
            uid
              ? supabaseAuthClient
                  .from("community_replies")
                  .select("thread_id")
                  .eq("user_id", uid)
              : Promise.resolve({ data: [] as { thread_id: string }[] }),
          ]);

        const voteCounts: Record<string, number> = {};
        for (const v of votesRes.data || []) {
          voteCounts[v.thread_id] = (voteCounts[v.thread_id] || 0) + 1;
        }

        const replyCounts: Record<string, number> = {};
        for (const r of repliesRes.data || []) {
          replyCounts[r.thread_id] = (replyCounts[r.thread_id] || 0) + 1;
        }

        setQuestions(
          ((threadsRes.data || []) as unknown as Array<{
            id: string;
            title: string;
            body: string;
            category: string;
            created_at: string;
            accepted_reply_id: string | null;
            profiles: {
              display_name: string | null;
              email: string | null;
            } | null;
          }>).map((t) => ({
            id: t.id,
            title: t.title,
            body: t.body,
            category: t.category,
            created_at: t.created_at,
            accepted_reply_id: t.accepted_reply_id,
            authorName:
              t.profiles?.display_name ||
              t.profiles?.email ||
              "Community Member",
            voteCount: voteCounts[t.id] || 0,
            replyCount: replyCounts[t.id] || 0,
          }))
        );

        setMyAnsweredIds(
          new Set((myRepliesRes.data || []).map((r) => r.thread_id))
        );
      }

      setLoading(false);
    }

    load();
  }, [kind]);

  const filteredPolls = useMemo(() => {
    if (subFilter === "all") return polls;
    if (subFilter === "answered")
      return polls.filter((p) => myAnsweredIds.has(p.id));
    return polls.filter((p) => !myAnsweredIds.has(p.id));
  }, [polls, subFilter, myAnsweredIds]);

  const filteredQuestions = useMemo(() => {
    if (subFilter === "all") return questions;
    if (subFilter === "answered")
      return questions.filter((q) => myAnsweredIds.has(q.id));
    return questions.filter((q) => !myAnsweredIds.has(q.id));
  }, [questions, subFilter, myAnsweredIds]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SUB_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setSubFilter(f.value)}
            disabled={!userId && f.value !== "all"}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              subFilter === f.value
                ? "border-brand bg-brand text-zinc-900"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white"
            />
          ))}

        {!loading && kind === "poll" && filteredPolls.length === 0 && (
          <EmptyState subFilter={subFilter} />
        )}

        {!loading &&
          kind === "poll" &&
          filteredPolls.map((p) => (
            <div key={p.id} className="relative">
              {myAnsweredIds.has(p.id) && <AnsweredRibbon />}
              <PollCard
                id={p.id}
                question={p.question}
                authorName={p.authorName}
                category={p.category}
                voteCount={p.voteCount}
                createdAt={p.created_at}
              />
            </div>
          ))}

        {!loading &&
          kind === "question" &&
          filteredQuestions.length === 0 && (
            <EmptyState subFilter={subFilter} />
          )}

        {!loading &&
          kind === "question" &&
          filteredQuestions.map((q) => (
            <div key={q.id} className="relative">
              {myAnsweredIds.has(q.id) && <AnsweredRibbon />}
              <QuestionCard
                id={q.id}
                title={q.title}
                preview={q.body}
                authorName={q.authorName}
                category={q.category}
                replyCount={q.replyCount}
                voteCount={q.voteCount}
                createdAt={q.created_at}
                isAnswered={Boolean(q.accepted_reply_id)}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

function AnsweredRibbon() {
  return (
    <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
      ✓ You answered
    </span>
  );
}

function EmptyState({ subFilter }: { subFilter: SubFilter }) {
  const message =
    subFilter === "answered"
      ? "You haven't answered anything here yet."
      : subFilter === "unanswered"
        ? "You're all caught up — nothing left to answer."
        : "Nothing here yet.";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
      {message}
    </div>
  );
}
