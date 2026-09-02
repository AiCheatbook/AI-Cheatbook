"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ContentType =
  | "news"
  | "prompt"
  | "learning_card";

type CommentRow = {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type ReactionType =
  | "like"
  | "love"
  | "laugh"
  | "wow";

type ReactionRow = {
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
};

type CommentSectionProps = {
  contentType: ContentType;
  contentId: string;
};

const REACTIONS: {
  type: ReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "laugh", emoji: "😂", label: "Laugh" },
  { type: "wow", emoji: "😮", label: "Wow" },
];

export default function CommentSection({
  contentType,
  contentId,
}: CommentSectionProps) {
  const [comments, setComments] = useState<
    CommentRow[]
  >([]);
  const [reactions, setReactions] = useState<
    ReactionRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [newComment, setNewComment] =
    useState("");
  const [posting, setPosting] =
    useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);
  const [isAdmin, setIsAdmin] =
    useState(false);

  const [replyingTo, setReplyingTo] =
    useState<string | null>(null);
  const [replyText, setReplyText] =
    useState("");
  const [reactionPickerFor, setReactionPickerFor] =
    useState<string | null>(null);

  async function loadComments() {
    setLoading(true);

    const [
      commentsResponse,
      reactionsResponse,
    ] = await Promise.all([
      supabaseAuthClient
        .from("comments")
        .select(
          `
            id,
            comment_text,
            created_at,
            user_id,
            parent_comment_id,
            profiles (
              display_name,
              email,
              avatar_url
            )
          `
        )
        .eq(
          "content_type",
          contentType
        )
        .eq("content_id", contentId)
        .order("created_at", {
          ascending: false,
        }),
      supabaseAuthClient
        .from("comment_reactions")
        .select(
          "comment_id, user_id, reaction_type"
        ),
    ]);

    if (!commentsResponse.error) {
      setComments(
        (commentsResponse.data ||
          []) as unknown as CommentRow[]
      );
    }

    if (!reactionsResponse.error) {
      setReactions(
        (reactionsResponse.data ||
          []) as ReactionRow[]
      );
    }

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

      if (user) {
        const { data: profile } =
          await supabaseAuthClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        setIsAdmin(
          profile?.role === "admin"
        );
      }

      await loadComments();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId]);

  async function handlePost(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!newComment.trim()) {
      return;
    }

    setPosting(true);

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setError(
          "Please log in to comment."
        );
        return;
      }

      const { error: insertError } =
        await supabaseAuthClient
          .from("comments")
          .insert({
            content_type: contentType,
            content_id: contentId,
            user_id: user.id,
            comment_text:
              newComment.trim(),
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setNewComment("");
      await loadComments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to post comment."
      );
    } finally {
      setPosting(false);
    }
  }

  async function handlePostReply(
    parentId: string
  ) {
    if (!replyText.trim()) {
      return;
    }

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    const { error: insertError } =
      await supabaseAuthClient
        .from("comments")
        .insert({
          content_type: contentType,
          content_id: contentId,
          user_id: user.id,
          comment_text:
            replyText.trim(),
          parent_comment_id: parentId,
        });

    if (!insertError) {
      setReplyText("");
      setReplyingTo(null);
      await loadComments();
    }
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed = window.confirm(
      "Delete this comment?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabaseAuthClient
      .from("comments")
      .delete()
      .eq("id", id);

    if (!error) {
      setComments((current) =>
        current.filter(
          (c) =>
            c.id !== id &&
            c.parent_comment_id !== id
        )
      );
    }
  }

  async function handleReact(
    commentId: string,
    reactionType: ReactionType
  ) {
    if (!currentUserId) {
      setReactionPickerFor(null);
      return;
    }

    const existing = reactions.find(
      (r) =>
        r.comment_id === commentId &&
        r.user_id === currentUserId
    );

    if (
      existing &&
      existing.reaction_type ===
        reactionType
    ) {
      // Clicking the same reaction again
      // removes it.

      await supabaseAuthClient
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);

      setReactions((current) =>
        current.filter(
          (r) =>
            !(
              r.comment_id ===
                commentId &&
              r.user_id === currentUserId
            )
        )
      );
    } else {
      await supabaseAuthClient
        .from("comment_reactions")
        .upsert(
          {
            comment_id: commentId,
            user_id: currentUserId,
            reaction_type: reactionType,
          },
          {
            onConflict:
              "comment_id,user_id",
          }
        );

      setReactions((current) => [
        ...current.filter(
          (r) =>
            !(
              r.comment_id ===
                commentId &&
              r.user_id === currentUserId
            )
        ),
        {
          comment_id: commentId,
          user_id: currentUserId,
          reaction_type: reactionType,
        },
      ]);
    }

    setReactionPickerFor(null);
  }

  function reactionSummary(
    commentId: string
  ) {
    const forComment = reactions.filter(
      (r) => r.comment_id === commentId
    );

    const counts: Record<
      string,
      number
    > = {};

    for (const r of forComment) {
      counts[r.reaction_type] =
        (counts[r.reaction_type] || 0) +
        1;
    }

    const mine = forComment.find(
      (r) => r.user_id === currentUserId
    )?.reaction_type;

    return { counts, mine };
  }

  const topLevel = comments.filter(
    (c) => !c.parent_comment_id
  );

  function repliesTo(
    commentId: string
  ): CommentRow[] {
    return comments
      .filter(
        (c) =>
          c.parent_comment_id ===
          commentId
      )
      .sort(
        (a, b) =>
          new Date(
            a.created_at
          ).getTime() -
          new Date(
            b.created_at
          ).getTime()
      );
  }

  function renderComment(
    comment: CommentRow,
    isReply: boolean
  ) {
    const authorName =
      comment.profiles
        ?.display_name ||
      comment.profiles?.email ||
      "Community Member";

    const canDelete =
      comment.user_id ===
        currentUserId || isAdmin;

    const { counts, mine } =
      reactionSummary(comment.id);

    const totalReactions =
      Object.values(counts).reduce(
        (sum, n) => sum + n,
        0
      );

    return (
      <div
        key={comment.id}
        className={
          isReply
            ? "ml-10 mt-3 rounded-xl border border-zinc-800 bg-black p-3"
            : "rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {comment.profiles
              ?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  comment.profiles
                    .avatar_url
                }
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                {authorName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <span className="text-sm font-medium text-white">
              {authorName}
            </span>

            <span className="text-xs text-zinc-600">
              {new Date(
                comment.created_at
              ).toLocaleDateString()}
            </span>
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                handleDelete(comment.id)
              }
              className="text-xs text-zinc-600 hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>

        <p className="mt-2 text-sm text-zinc-300">
          {comment.comment_text}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setReactionPickerFor(
                  reactionPickerFor ===
                    comment.id
                    ? null
                    : comment.id
                )
              }
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                mine
                  ? "bg-brand/15 text-brand"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {mine
                ? REACTIONS.find(
                    (r) =>
                      r.type === mine
                  )?.emoji
                : "👍"}{" "}
              {totalReactions > 0
                ? totalReactions
                : "React"}
            </button>

            {reactionPickerFor ===
              comment.id && (
              <div className="absolute bottom-8 left-0 z-10 flex gap-1 rounded-full border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
                {REACTIONS.map(
                  (reaction) => (
                    <button
                      key={
                        reaction.type
                      }
                      type="button"
                      title={
                        reaction.label
                      }
                      onClick={() =>
                        handleReact(
                          comment.id,
                          reaction.type
                        )
                      }
                      className="rounded-full p-1.5 text-lg transition hover:scale-125 hover:bg-zinc-800"
                    >
                      {reaction.emoji}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {!isReply &&
            currentUserId && (
              <button
                type="button"
                onClick={() =>
                  setReplyingTo(
                    replyingTo ===
                      comment.id
                      ? null
                      : comment.id
                  )
                }
                className="text-xs text-zinc-500 hover:text-white"
              >
                Reply
              </button>
            )}
        </div>

        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <input
              value={replyText}
              onChange={(e) =>
                setReplyText(
                  e.target.value
                )
              }
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-zinc-800 bg-black px-3 py-1.5 text-sm text-white outline-none focus:border-brand"
            />

            <button
              type="button"
              onClick={() =>
                handlePostReply(
                  comment.id
                )
              }
              disabled={
                !replyText.trim()
              }
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        )}

        {!isReply &&
          repliesTo(comment.id).map(
            (reply) =>
              renderComment(reply, true)
          )}
      </div>
    );
  }

  return (
    <section className="mt-12 border-t border-zinc-800 pt-8">
      <h2 className="text-lg font-semibold text-white">
        Comments{" "}
        {!loading &&
          `(${comments.length})`}
      </h2>

      {currentUserId ? (
        <form
          onSubmit={handlePost}
          className="mt-4"
        >
          <textarea
            value={newComment}
            onChange={(e) =>
              setNewComment(
                e.target.value
              )
            }
            rows={3}
            placeholder="Share your thoughts..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand"
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              posting ||
              !newComment.trim()
            }
            className="mt-2 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {posting
              ? "Posting..."
              : "Post Comment"}
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
          <a
            href="/login"
            className="text-brand hover:text-brand"
          >
            Log in
          </a>{" "}
          to leave a comment.
        </p>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({
            length: 2,
          }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-zinc-900"
            />
          ))}
        </div>
      )}

      {!loading &&
        topLevel.length === 0 && (
          <p className="mt-6 text-sm text-zinc-500">
            No comments yet — be the
            first to share your thoughts.
          </p>
        )}

      {!loading &&
        topLevel.length > 0 && (
          <div className="mt-6 space-y-4">
            {topLevel.map((comment) =>
              renderComment(
                comment,
                false
              )
            )}
          </div>
        )}
    </section>
  );
}
