"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type PollRow = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  is_multiple_choice: boolean;
  expires_at: string | null;
  user_id: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
};

type OptionRow = {
  id: string;
  option_text: string;
  sort_order: number;
};

export default function PollDetailPage() {
  const params = useParams();
  const pollId = params.id as string;

  const [poll, setPoll] =
    useState<PollRow | null>(null);
  const [options, setOptions] = useState<
    OptionRow[]
  >([]);
  const [voteCounts, setVoteCounts] =
    useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<
    Set<string>
  >(new Set());
  const [selected, setSelected] = useState<
    Set<string>
  >(new Set());

  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);
  const [submitting, setSubmitting] =
    useState(false);

  async function loadPoll() {
    setLoading(true);
    setError("");

    const [
      pollResponse,
      optionsResponse,
      votesResponse,
    ] = await Promise.all([
      supabaseAuthClient
        .from("community_polls")
        .select(
          `
            id,
            question,
            description,
            category,
            is_multiple_choice,
            expires_at,
            user_id,
            created_at,
            profiles (
              display_name,
              email
            )
          `
        )
        .eq("id", pollId)
        .single(),
      supabaseAuthClient
        .from("community_poll_options")
        .select("id, option_text, sort_order")
        .eq("poll_id", pollId)
        .order("sort_order", {
          ascending: true,
        }),
      supabaseAuthClient
        .from("community_poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", pollId),
    ]);

    if (pollResponse.error) {
      setError("Poll not found.");
      setLoading(false);
      return;
    }

    setPoll(
      pollResponse.data as unknown as PollRow
    );
    setOptions(
      (optionsResponse.data ||
        []) as OptionRow[]
    );

    const allVotes =
      votesResponse.data || [];

    const counts: Record<string, number> =
      {};

    for (const v of allVotes) {
      counts[v.option_id] =
        (counts[v.option_id] || 0) + 1;
    }

    setVoteCounts(counts);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      setCurrentUserId(
        user?.id || null
      );

      await loadPoll();

      if (user) {
        const { data: mine } =
          await supabaseAuthClient
            .from(
              "community_poll_votes"
            )
            .select("option_id")
            .eq("poll_id", pollId)
            .eq("user_id", user.id);

        const myVoteSet = new Set(
          (mine || []).map(
            (v) => v.option_id
          )
        );

        setMyVotes(myVoteSet);
        setSelected(
          new Set(myVoteSet)
        );
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const hasVoted = myVotes.size > 0;

  const totalVotes = Object.values(
    voteCounts
  ).reduce((sum, n) => sum + n, 0);

  const isExpired =
    poll?.expires_at &&
    new Date(poll.expires_at) < new Date();

  function toggleSelect(optionId: string) {
    if (hasVoted || isExpired) {
      return;
    }

    setSelected((current) => {
      const next = new Set(current);

      if (poll?.is_multiple_choice) {
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

  async function handleVote() {
    if (!currentUserId) {
      setError(
        "Please log in to vote."
      );
      return;
    }

    if (selected.size === 0) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: insertError } =
        await supabaseAuthClient
          .from(
            "community_poll_votes"
          )
          .insert(
            Array.from(selected).map(
              (optionId) => ({
                poll_id: pollId,
                option_id: optionId,
                user_id: currentUserId,
              })
            )
          );

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setMyVotes(new Set(selected));
      await loadPoll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit vote."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      </main>
    );
  }

  if (error && !poll) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-red-400">
            {error}
          </p>
          <Link
            href="/community"
            className="mt-4 inline-block text-brand hover:text-brand"
          >
            ← Back to Community
          </Link>
        </div>
      </main>
    );
  }

  if (!poll) {
    return null;
  }

  const authorName =
    poll.profiles?.display_name ||
    poll.profiles?.email ||
    "Community Member";

  const showResults =
    hasVoted || isExpired;

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/community"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Community
        </Link>

        <div className="mt-4 rounded-2xl border border-green-500/30 bg-zinc-900 p-6">
          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            📊 Poll
          </span>

          <h1 className="mt-3 text-xl font-bold">
            {poll.question}
          </h1>

          {poll.description && (
            <p className="mt-1 text-sm text-zinc-400">
              {poll.description}
            </p>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            {authorName} ·{" "}
            {totalVotes}{" "}
            {totalVotes === 1
              ? "vote"
              : "votes"}
            {isExpired &&
              " · Expired"}
          </p>

          <div className="mt-5 space-y-2">
            {options.map((option) => {
              const count =
                voteCounts[option.id] ||
                0;
              const percent =
                totalVotes > 0
                  ? Math.round(
                      (count /
                        totalVotes) *
                        100
                    )
                  : 0;

              const isSelected =
                selected.has(option.id);

              if (showResults) {
                return (
                  <div
                    key={option.id}
                    className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black p-3"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-brand/20 transition-all duration-700"
                      style={{
                        width: `${percent}%`,
                      }}
                    />

                    <div className="relative flex items-center justify-between text-sm">
                      <span
                        className={
                          myVotes.has(
                            option.id
                          )
                            ? "font-semibold text-brand"
                            : "text-zinc-200"
                        }
                      >
                        {
                          option.option_text
                        }{" "}
                        {myVotes.has(
                          option.id
                        ) && "✓"}
                      </span>
                      <span className="text-zinc-400">
                        {percent}% (
                        {count})
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    toggleSelect(
                      option.id
                    )
                  }
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-brand bg-brand/10 text-white"
                      : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {option.option_text}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {!showResults && (
            <button
              type="button"
              onClick={handleVote}
              disabled={
                selected.size === 0 ||
                submitting
              }
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : "Vote"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
