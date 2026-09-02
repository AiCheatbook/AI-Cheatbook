"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { createNotification } from "@/lib/notifications/createNotification";
import CommunityLayout from "@/components/community/layout/CommunityLayout";

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  content_kind:
    | "question"
    | "discussion"
    | "discovery";
  user_id: string;
  accepted_reply_id: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type ReplyRow = {
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
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

export default function DiscussionDetailClient() {
  const params = useParams();
  const threadId = params.id as string;

  const [thread, setThread] =
    useState<ThreadRow | null>(null);
  const [replies, setReplies] = useState<
    ReplyRow[]
  >([]);
  const [threadVoteCount, setThreadVoteCount] =
    useState(0);
  const [myThreadVote, setMyThreadVote] =
    useState(false);
  const [replyVoteCounts, setReplyVoteCounts] =
    useState<Record<string, number>>({});
  const [myReplyVotes, setMyReplyVotes] =
    useState<Set<string>>(new Set());

  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);
  const [isAdmin, setIsAdmin] =
    useState(false);

  const [newReply, setNewReply] =
    useState("");
  const [replyingTo, setReplyingTo] =
    useState<string | null>(null);
  const [nestedReplyText, setNestedReplyText] =
    useState("");
  const [posting, setPosting] =
    useState(false);

  async function loadThread() {
    setLoading(true);
    setError("");

    const [
      threadResponse,
      repliesResponse,
      threadVotesResponse,
      replyVotesResponse,
    ] = await Promise.all([
      supabaseAuthClient
        .from("community_threads")
        .select(
          `
            id,
            title,
            body,
            category,
            content_kind,
            user_id,
            accepted_reply_id,
            created_at,
            profiles (
              display_name,
              email,
              avatar_url
            )
          `
        )
        .eq("id", threadId)
        .single(),
      supabaseAuthClient
        .from("community_replies")
        .select(
          `
            id,
            thread_id,
            parent_reply_id,
            user_id,
            body,
            created_at,
            profiles (
              display_name,
              email,
              avatar_url
            )
          `
        )
        .eq("thread_id", threadId)
        .order("created_at", {
          ascending: true,
        }),
      supabaseAuthClient
        .from("community_thread_votes")
        .select("user_id")
        .eq("thread_id", threadId),
      supabaseAuthClient
        .from("community_reply_votes")
        .select("reply_id, user_id"),
    ]);

    if (threadResponse.error) {
      setError(
        "Discussion not found."
      );
      setLoading(false);
      return;
    }

    setThread(
      threadResponse.data as unknown as ThreadRow
    );
    setReplies(
      (repliesResponse.data ||
        []) as unknown as ReplyRow[]
    );

    const threadVotes =
      threadVotesResponse.data || [];
    setThreadVoteCount(
      threadVotes.length
    );

    const allReplyVotes =
      replyVotesResponse.data || [];

    const relevantReplyIds = new Set(
      (
        (repliesResponse.data ||
          []) as unknown as ReplyRow[]
      ).map((r) => r.id)
    );

    const counts: Record<
      string,
      number
    > = {};

    for (const v of allReplyVotes) {
      if (
        relevantReplyIds.has(v.reply_id)
      ) {
        counts[v.reply_id] =
          (counts[v.reply_id] || 0) + 1;
      }
    }

    setReplyVoteCounts(counts);

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

        const { data: myThreadVoteRow } =
          await supabaseAuthClient
            .from(
              "community_thread_votes"
            )
            .select("id")
            .eq("thread_id", threadId)
            .eq("user_id", user.id)
            .maybeSingle();

        setMyThreadVote(
          Boolean(myThreadVoteRow)
        );

        const { data: myReplyVoteRows } =
          await supabaseAuthClient
            .from(
              "community_reply_votes"
            )
            .select("reply_id")
            .eq("user_id", user.id);

        setMyReplyVotes(
          new Set(
            (myReplyVoteRows || []).map(
              (r) => r.reply_id
            )
          )
        );
      }

      await loadThread();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function handleThreadVote() {
    if (!currentUserId) {
      return;
    }

    if (myThreadVote) {
      await supabaseAuthClient
        .from("community_thread_votes")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", currentUserId);

      setMyThreadVote(false);
      setThreadVoteCount((n) => n - 1);
    } else {
      await supabaseAuthClient
        .from("community_thread_votes")
        .insert({
          thread_id: threadId,
          user_id: currentUserId,
        });

      setMyThreadVote(true);
      setThreadVoteCount((n) => n + 1);
    }
  }

  async function handleReplyVote(
    replyId: string
  ) {
    if (!currentUserId) {
      return;
    }

    const hasVoted =
      myReplyVotes.has(replyId);

    if (hasVoted) {
      await supabaseAuthClient
        .from("community_reply_votes")
        .delete()
        .eq("reply_id", replyId)
        .eq("user_id", currentUserId);

      setMyReplyVotes((current) => {
        const next = new Set(current);
        next.delete(replyId);
        return next;
      });

      setReplyVoteCounts((current) => ({
        ...current,
        [replyId]:
          (current[replyId] || 1) - 1,
      }));
    } else {
      await supabaseAuthClient
        .from("community_reply_votes")
        .insert({
          reply_id: replyId,
          user_id: currentUserId,
        });

      setMyReplyVotes(
        (current) =>
          new Set(current).add(replyId)
      );

      setReplyVoteCounts((current) => ({
        ...current,
        [replyId]:
          (current[replyId] || 0) + 1,
      }));
    }
  }

  async function handlePostReply(
    parentReplyId: string | null
  ) {
    const text = parentReplyId
      ? nestedReplyText
      : newReply;

    if (!text.trim()) {
      return;
    }

    if (!currentUserId) {
      setError(
        "Please log in to reply."
      );
      return;
    }

    setPosting(true);

    const { error: insertError } =
      await supabaseAuthClient
        .from("community_replies")
        .insert({
          thread_id: threadId,
          parent_reply_id: parentReplyId,
          user_id: currentUserId,
          body: text.trim(),
        });

    setPosting(false);

    if (!insertError) {
      if (parentReplyId) {
        setNestedReplyText("");
        setReplyingTo(null);

        const parentReply = replies.find(
          (r) => r.id === parentReplyId
        );

        if (parentReply) {
          await createNotification({
            userId:
              parentReply.user_id,
            actorId: currentUserId,
            type: "reply",
            message:
              "Someone replied to your comment.",
            link: `/discussions/${threadId}`,
          });
        }
      } else {
        setNewReply("");

        if (thread) {
          await createNotification({
            userId: thread.user_id,
            actorId: currentUserId,
            type: "reply",
            message: `Someone replied to "${thread.title}".`,
            link: `/discussions/${threadId}`,
          });
        }
      }

      await loadThread();
    }
  }

  async function handleAcceptAnswer(
    replyId: string
  ) {
    if (
      !thread ||
      currentUserId !== thread.user_id
    ) {
      return;
    }

    const newAcceptedId =
      thread.accepted_reply_id ===
      replyId
        ? null
        : replyId;

    const { error: updateError } =
      await supabaseAuthClient
        .from("community_threads")
        .update({
          accepted_reply_id:
            newAcceptedId,
        })
        .eq("id", threadId);

    if (!updateError) {
      setThread((current) =>
        current
          ? {
              ...current,
              accepted_reply_id:
                newAcceptedId,
            }
          : current
      );

      if (newAcceptedId) {
        const acceptedReply = replies.find(
          (r) => r.id === newAcceptedId
        );

        if (acceptedReply) {
          await createNotification({
            userId:
              acceptedReply.user_id,
            actorId: currentUserId,
            type: "answer_accepted",
            message: `Your answer was accepted on "${thread.title}".`,
            link: `/discussions/${threadId}`,
          });
        }
      }
    }
  }

  async function handleDeleteThread() {
    const confirmed = window.confirm(
      "Delete this entire discussion?"
    );

    if (!confirmed) {
      return;
    }

    await supabaseAuthClient
      .from("community_threads")
      .delete()
      .eq("id", threadId);

    window.location.href =
      "/discussions";
  }

  async function handleDeleteReply(
    replyId: string
  ) {
    const confirmed = window.confirm(
      "Delete this reply?"
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } =
      await supabaseAuthClient
        .from("community_replies")
        .delete()
        .eq("id", replyId);

    if (!deleteError) {
      await loadThread();
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-zinc-900">
        <div className="mx-auto max-w-3xl">
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (error || !thread) {
    return (
      <main className="min-h-screen bg-white px-6 py-12 text-zinc-900">
        <div className="mx-auto max-w-3xl">
          <p className="text-red-400">
            {error ||
              "Discussion not found."}
          </p>
          <Link
            href="/discussions"
            className="mt-4 inline-block text-brand hover:text-brand"
          >
            ← Back to Discussions
          </Link>
        </div>
      </main>
    );
  }

  const authorName =
    thread.profiles?.display_name ||
    thread.profiles?.email ||
    "Community Member";

  const isThreadOwner =
    currentUserId === thread.user_id;

  const topLevelReplies = replies.filter(
    (r) => !r.parent_reply_id
  );

  function nestedRepliesTo(
    replyId: string
  ): ReplyRow[] {
    return replies.filter(
      (r) => r.parent_reply_id === replyId
    );
  }

  function renderReply(
    reply: ReplyRow,
    isNested: boolean
  ) {
    const replyAuthor =
      reply.profiles?.display_name ||
      reply.profiles?.email ||
      "Community Member";

    const isAccepted =
      thread!.accepted_reply_id ===
      reply.id;

    const voteCount =
      replyVoteCounts[reply.id] || 0;

    const canDelete =
      reply.user_id === currentUserId ||
      isAdmin;

    return (
      <div
        key={reply.id}
        className={`${
          isNested ? "ml-10 mt-3" : "mt-3"
        } rounded-xl border p-4 ${
          isAccepted
            ? "border-green-600/50 bg-green-500/5"
            : "border-zinc-200 bg-white"
        }`}
      >
        {isAccepted && (
          <p className="mb-2 text-xs font-semibold text-green-400">
            ✓ Accepted Answer
          </p>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {reply.profiles
              ?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  reply.profiles
                    .avatar_url
                }
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand">
                {replyAuthor
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <span className="text-sm font-medium text-zinc-900">
              {replyAuthor}
            </span>

            <span className="text-xs text-zinc-600">
              {new Date(
                reply.created_at
              ).toLocaleDateString()}
            </span>
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                handleDeleteReply(
                  reply.id
                )
              }
              className="text-xs text-zinc-600 hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>

        <p className="mt-2 text-sm text-zinc-600">
          {reply.body}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              handleReplyVote(reply.id)
            }
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              myReplyVotes.has(reply.id)
                ? "bg-brand/15 text-brand"
                : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
            }`}
          >
            ▲ {voteCount}
          </button>

          {!isNested &&
            currentUserId && (
              <button
                type="button"
                onClick={() =>
                  setReplyingTo(
                    replyingTo ===
                      reply.id
                      ? null
                      : reply.id
                  )
                }
                className="text-xs text-zinc-600 hover:text-zinc-900"
              >
                Reply
              </button>
            )}

          {isThreadOwner && (
            <button
              type="button"
              onClick={() =>
                handleAcceptAnswer(
                  reply.id
                )
              }
              className={`text-xs ${
                isAccepted
                  ? "text-green-400 hover:text-green-300"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {isAccepted
                ? "✓ Accepted"
                : "Mark as answer"}
            </button>
          )}
        </div>

        {replyingTo === reply.id && (
          <div className="mt-3 flex gap-2">
            <input
              value={nestedReplyText}
              onChange={(e) =>
                setNestedReplyText(
                  e.target.value
                )
              }
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand"
            />

            <button
              type="button"
              onClick={() =>
                handlePostReply(
                  reply.id
                )
              }
              disabled={
                !nestedReplyText.trim() ||
                posting
              }
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        )}

        {!isNested &&
          nestedRepliesTo(reply.id).map(
            (nested) =>
              renderReply(nested, true)
          )}
      </div>
    );
  }

  return (
    <CommunityLayout>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/discussions"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Discussions
        </Link>

        <div className="mt-3 flex items-center gap-2">
          {thread.content_kind ===
            "question" && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
              💡 QUESTION
            </span>
          )}

          {thread.content_kind ===
            "discovery" && (
            <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400">
              🚀 DISCOVERY
            </span>
          )}

          {thread.accepted_reply_id && (
            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
              ✓ Answered
            </span>
          )}

          {thread.content_kind ===
            "question" &&
            !thread.accepted_reply_id && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                Unanswered
              </span>
            )}

          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
            {
              CATEGORY_LABELS[
                thread.category
              ]
            }
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold">
          {thread.title}
        </h1>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            {authorName} ·{" "}
            {new Date(
              thread.created_at
            ).toLocaleDateString()}
          </p>

          {(isThreadOwner || isAdmin) && (
            <button
              type="button"
              onClick={handleDeleteThread}
              className="text-xs text-zinc-600 hover:text-red-400"
            >
              Delete Discussion
            </button>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="whitespace-pre-wrap text-zinc-700">
            {thread.body}
          </p>

          <button
            type="button"
            onClick={handleThreadVote}
            className={`mt-4 rounded-full px-3 py-1.5 text-sm transition ${
              myThreadVote
                ? "bg-brand/15 text-brand"
                : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
            }`}
          >
            ▲ {threadVoteCount}{" "}
            {threadVoteCount === 1
              ? "vote"
              : "votes"}
          </button>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-zinc-900">
          {topLevelReplies.length}{" "}
          {thread.content_kind ===
          "question"
            ? topLevelReplies.length ===
              1
              ? "Answer"
              : "Answers"
            : topLevelReplies.length ===
                1
              ? "Reply"
              : "Replies"}
        </h2>

        {currentUserId ? (
          <div className="mt-4">
            <textarea
              value={newReply}
              onChange={(e) =>
                setNewReply(
                  e.target.value
                )
              }
              rows={3}
              placeholder="Write a reply..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-brand"
            />

            <button
              type="button"
              onClick={() =>
                handlePostReply(null)
              }
              disabled={
                !newReply.trim() ||
                posting
              }
              className="mt-2 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
            >
              {posting
                ? "Posting..."
                : "Post Reply"}
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            <Link
              href="/login"
              className="text-brand hover:text-brand"
            >
              Log in
            </Link>{" "}
            to reply.
          </p>
        )}

        {topLevelReplies.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">
            No replies yet.
          </p>
        ) : (
          <div className="mt-4">
            {topLevelReplies.map(
              (reply) =>
                renderReply(reply, false)
            )}
          </div>
        )}
      </div>
    </CommunityLayout>
  );
}
