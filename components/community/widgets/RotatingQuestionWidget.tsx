"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { useRotatingContent } from "@/lib/community/useRotatingContent";
import {
  awardCommunityPoints,
  POINTS_FOR_REPLY,
} from "@/lib/community/awardPoints";
import { isUserDisabled } from "@/lib/community/checkDisabled";

type QuestionSummary = {
  id: string;
  title: string;
  body: string;
  category: string;
  group_id: string | null;
};

export default function RotatingQuestionWidget() {
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const { current, skip } = useRotatingContent(questions);

  async function loadUnansweredQuestions(uid: string) {
    setLoading(true);

    const [threadsRes, myRepliesRes] = await Promise.all([
      supabaseAuthClient
        .from("community_threads")
        .select("id, title, body, category, group_id, created_at")
        .eq("content_kind", "question")
        .eq("is_hidden", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabaseAuthClient
        .from("community_replies")
        .select("thread_id")
        .eq("user_id", uid),
    ]);

    if (threadsRes.error) {
      console.error(
        "RotatingQuestionWidget: failed to load questions:",
        threadsRes.error.message
      );
    }

    if (myRepliesRes.error) {
      console.error(
        "RotatingQuestionWidget: failed to load my replies:",
        myRepliesRes.error.message
      );
    }

    const answeredThreadIds = new Set(
      (myRepliesRes.data || []).map((r) => r.thread_id)
    );

    const unanswered = (threadsRes.data || []).filter(
      (t) => !answeredThreadIds.has(t.id)
    ) as QuestionSummary[];

    setQuestions(unanswered);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadUnansweredQuestions(user.id);
    }

    init();
  }, []);

  function handleAnswered(threadId: string) {
    // Permanently drop this question — the user answered it.
    setQuestions((prev) => prev.filter((q) => q.id !== threadId));
  }

  if (!userId || loading || !current) {
    return null;
  }

  return (
    <QuestionReplyCard
      // Keying by thread id remounts the form (fresh reply-text
      // state) whenever we rotate to a different question.
      key={current.id}
      question={current}
      userId={userId}
      onSkip={skip}
      onAnswered={() => handleAnswered(current.id)}
    />
  );
}

function QuestionReplyCard({
  question,
  userId,
  onSkip,
  onAnswered,
}: {
  question: QuestionSummary;
  userId: string;
  onSkip: () => void;
  onAnswered: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReply() {
    if (!replyText.trim()) return;

    if (await isUserDisabled(userId)) return;

    setSubmitting(true);

    const { error } = await supabaseAuthClient
      .from("community_replies")
      .insert({
        thread_id: question.id,
        parent_reply_id: null,
        user_id: userId,
        body: replyText.trim(),
      });

    setSubmitting(false);

    if (!error) {
      if (question.group_id) {
        await awardCommunityPoints(
          question.group_id,
          userId,
          POINTS_FOR_REPLY
        );
      }
      onAnswered();
    }
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-brand-text">
          ❓ QUESTION
        </span>
        <Link
          href={`/discussions/${question.id}`}
          className="text-xs text-zinc-600 hover:text-brand-text"
        >
          View full thread
        </Link>
      </div>

      <h3 className="mt-2.5 text-sm font-semibold text-zinc-900">
        {question.title}
      </h3>

      <p className="mt-1.5 line-clamp-3 text-xs text-zinc-600">
        {question.body}
      </p>

      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Share your answer..."
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submitReply}
          disabled={!replyText.trim() || submitting}
          className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Reply"}
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:border-zinc-400"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
