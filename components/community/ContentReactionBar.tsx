"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ReactionType = "like" | "love" | "laugh" | "wow";

type ReactionRow = {
  user_id: string;
  reaction_type: ReactionType;
};

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "wow", emoji: "😮", label: "Wow" },
];

type ContentReactionBarProps = {
  contentType: "news" | "learning_card";
  contentId: string;
};

/*
 * Article-level Like/React, backed by the new content_reactions
 * table (database/040_content_reactions.sql) — the same
 * pattern as comment_reactions, one level up (reacting to the
 * post itself, not a comment on it).
 */
export default function ContentReactionBar({
  contentType,
  contentId,
}: ContentReactionBarProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      setUserId(user?.id || null);

      const { data, error } = await supabaseAuthClient
        .from("content_reactions")
        .select("user_id, reaction_type")
        .eq("content_type", contentType)
        .eq("content_id", contentId);

      if (error) {
        console.error(
          "ContentReactionBar: failed to load reactions:",
          error.message
        );
        setLoading(false);
        return;
      }

      const rows = (data || []) as ReactionRow[];
      setReactions(rows);

      if (user) {
        const mine = rows.find((r) => r.user_id === user.id);
        setMyReaction(mine?.reaction_type || null);
      }

      setLoading(false);
    }

    load();
  }, [contentType, contentId]);

  async function setReaction(type: ReactionType, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) return;

    setPickerOpen(false);

    if (myReaction === type) {
      // Clicking the same reaction again removes it.
      const { error } = await supabaseAuthClient
        .from("content_reactions")
        .delete()
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .eq("user_id", userId);

      if (!error) {
        setMyReaction(null);
        setReactions((prev) => prev.filter((r) => r.user_id !== userId));
      } else {
        console.error("ContentReactionBar: failed to remove reaction:", error.message);
      }
      return;
    }

    const { error } = await supabaseAuthClient
      .from("content_reactions")
      .upsert(
        {
          content_type: contentType,
          content_id: contentId,
          user_id: userId,
          reaction_type: type,
        },
        { onConflict: "content_type,content_id,user_id" }
      );

    if (!error) {
      setMyReaction(type);
      setReactions((prev) => [
        ...prev.filter((r) => r.user_id !== userId),
        { user_id: userId, reaction_type: type },
      ]);
    } else {
      console.error("ContentReactionBar: failed to set reaction:", error.message);
    }
  }

  const activeEmoji =
    REACTIONS.find((r) => r.type === myReaction)?.emoji || "👍";

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setPickerOpen(true)}
      onMouseLeave={() => setPickerOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => setReaction(myReaction || "like", e)}
        disabled={loading || !userId}
        title={userId ? undefined : "Log in to react"}
        className={`inline-flex items-center gap-1 text-xs transition disabled:cursor-not-allowed ${
          myReaction ? "text-brand-text" : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        <span>{activeEmoji}</span>
        <span>{reactions.length}</span>
      </button>

      {pickerOpen && userId && (
        <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-lg">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              title={r.label}
              onClick={(e) => setReaction(r.type, e)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:bg-zinc-100 ${
                myReaction === r.type ? "bg-brand/10" : ""
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
