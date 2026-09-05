"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { useRotatingContent } from "@/lib/community/useRotatingContent";
import {
  awardCommunityPoints,
  POINTS_FOR_POLL_VOTE,
} from "@/lib/community/awardPoints";
import { isUserDisabled } from "@/lib/community/checkDisabled";

type PollSummary = {
  id: string;
  question: string;
  category: string;
  is_multiple_choice: boolean;
  group_id: string | null;
};

type OptionRow = {
  id: string;
  option_text: string;
  sort_order: number;
};

export default function RotatingPollWidget() {
  const [userId, setUserId] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const { current, skip } = useRotatingContent(polls);

  async function loadUnansweredPolls(uid: string) {
    setLoading(true);

    const [pollsRes, myVotesRes] = await Promise.all([
      supabaseAuthClient
        .from("community_polls")
        .select("id, question, category, is_multiple_choice, group_id, created_at")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false }),
      supabaseAuthClient
        .from("community_poll_votes")
        .select("poll_id")
        .eq("user_id", uid),
    ]);

    if (pollsRes.error) {
      console.error(
        "RotatingPollWidget: failed to load polls:",
        pollsRes.error.message
      );
    }

    if (myVotesRes.error) {
      console.error(
        "RotatingPollWidget: failed to load my votes:",
        myVotesRes.error.message
      );
    }

    const answeredIds = new Set(
      (myVotesRes.data || []).map((v) => v.poll_id)
    );

    const unanswered = (pollsRes.data || []).filter(
      (p) => !answeredIds.has(p.id)
    ) as PollSummary[];

    setPolls(unanswered);
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
      await loadUnansweredPolls(user.id);
    }

    init();
  }, []);

  function handleAnswered(pollId: string) {
    // Permanently drop this poll — the user answered it.
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
  }

  // Not logged in, loading, or nothing left to show — render nothing
  // so the section fully collapses and the layout shifts up.
  if (!userId || loading || !current) {
    return null;
  }

  return (
    <PollVoteCard
      // Keying by poll id remounts the form (fresh option/selection
      // state) whenever we rotate to a different poll, instead of
      // resetting state inside an effect.
      key={current.id}
      poll={current}
      userId={userId}
      onSkip={skip}
      onAnswered={() => handleAnswered(current.id)}
    />
  );
}

function PollVoteCard({
  poll,
  userId,
  onSkip,
  onAnswered,
}: {
  poll: PollSummary;
  userId: string;
  onSkip: () => void;
  onAnswered: () => void;
}) {
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const { data } = await supabaseAuthClient
        .from("community_poll_options")
        .select("id, option_text, sort_order")
        .eq("poll_id", poll.id)
        .order("sort_order", { ascending: true });

      setOptions((data || []) as OptionRow[]);
      setOptionsLoading(false);
    }

    loadOptions();
  }, [poll.id]);

  function toggleOption(optionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (poll.is_multiple_choice) {
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
      } else {
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  }

  async function submitVote() {
    if (selected.size === 0) return;

    if (await isUserDisabled(userId)) return;

    setSubmitting(true);

    const { error } = await supabaseAuthClient
      .from("community_poll_votes")
      .insert(
        Array.from(selected).map((optionId) => ({
          poll_id: poll.id,
          option_id: optionId,
          user_id: userId,
        }))
      );

    setSubmitting(false);

    if (!error) {
      if (poll.group_id) {
        await awardCommunityPoints(
          poll.group_id,
          userId,
          POINTS_FOR_POLL_VOTE
        );
      }
      onAnswered();
    }
  }

  return (
    <div className="rounded-2xl border border-green-500/30 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
          📊 POLL
        </span>
        <Link
          href={`/community/polls/${poll.id}`}
          className="text-xs text-zinc-600 hover:text-brand-text"
        >
          View full poll
        </Link>
      </div>

      <h3 className="mt-2.5 text-sm font-semibold text-zinc-900">
        {poll.question}
      </h3>

      {optionsLoading ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-zinc-100" />
      ) : (
        <div className="mt-3 space-y-1.5">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                selected.has(option.id)
                  ? "border-brand bg-brand/10 text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {option.option_text}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submitVote}
          disabled={selected.size === 0 || submitting}
          className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Vote"}
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
