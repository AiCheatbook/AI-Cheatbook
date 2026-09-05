"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import {
  awardCommunityPoints,
  POINTS_FOR_RECEIVING_LIKE,
} from "@/lib/community/awardPoints";

type LikeButtonProps = {
  threadId: string;
  initialCount: number;
  compact?: boolean;
};

/*
 * Inline "Like" toggle for feed cards, backed by the existing
 * community_thread_votes table (same table/toggle pattern already
 * used on the discussion detail page) so a like here and a like
 * on the full thread page always agree.
 */
export default function LikeButton({
  threadId,
  initialCount,
  compact = false,
}: LikeButtonProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkVoted() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        setChecking(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabaseAuthClient
        .from("community_thread_votes")
        .select("id")
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "LikeButton: failed to check vote status:",
          error.message
        );
      }

      setLiked(Boolean(data));
      setChecking(false);
    }

    checkVoted();
  }, [threadId]);

  async function toggleLike(e: React.MouseEvent) {
    // Cards are often wrapped in a <Link> — don't navigate on click.
    e.preventDefault();
    e.stopPropagation();

    if (!userId || submitting) return;

    setSubmitting(true);

    if (liked) {
      const { error } = await supabaseAuthClient
        .from("community_thread_votes")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", userId);

      if (!error) {
        setLiked(false);
        setCount((n) => Math.max(0, n - 1));
      } else {
        console.error("LikeButton: failed to remove like:", error.message);
      }
    } else {
      const { error } = await supabaseAuthClient
        .from("community_thread_votes")
        .insert({ thread_id: threadId, user_id: userId });

      if (!error) {
        setLiked(true);
        setCount((n) => n + 1);

        const { data: threadRow, error: threadError } = await supabaseAuthClient
          .from("community_threads")
          .select("user_id, group_id")
          .eq("id", threadId)
          .maybeSingle();

        if (threadError) {
          console.error(
            "LikeButton: failed to look up thread for points:",
            threadError.message
          );
        } else if (
          threadRow?.group_id &&
          threadRow.user_id !== userId
        ) {
          await awardCommunityPoints(
            threadRow.group_id,
            threadRow.user_id,
            POINTS_FOR_RECEIVING_LIKE
          );
        }
      } else {
        console.error("LikeButton: failed to add like:", error.message);
      }
    }

    setSubmitting(false);
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={checking || submitting || !userId}
      title={userId ? undefined : "Log in to like"}
      className={`inline-flex items-center gap-1 rounded-full transition disabled:cursor-not-allowed ${
        compact ? "text-xs" : "text-sm"
      } ${
        liked
          ? "text-brand-text"
          : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      <span>{liked ? "▲" : "△"}</span>
      <span>{count}</span>
    </button>
  );
}
