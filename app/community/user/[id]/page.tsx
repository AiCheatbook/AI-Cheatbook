"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import CommunityLayout from "@/components/community/layout/CommunityLayout";
import {
  calculateReputation,
  badgeForScore,
} from "@/lib/community/reputation";

type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type ThreadRow = {
  id: string;
  title: string;
  content_kind: string;
  created_at: string;
};

const CONTENT_KIND_ICON: Record<
  string,
  string
> = {
  question: "💡",
  discussion: "💬",
  discovery: "🚀",
  prompt: "✨",
  learning: "📘",
  resource: "🔗",
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] =
    useState<Profile | null>(null);
  const [threads, setThreads] = useState<
    ThreadRow[]
  >([]);
  const [reputation, setReputation] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [isOwnProfile, setIsOwnProfile] =
    useState(false);
  const [editingBio, setEditingBio] =
    useState(false);
  const [bioDraft, setBioDraft] =
    useState("");
  const [savingBio, setSavingBio] =
    useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { user: currentUser },
      } =
        await supabaseAuthClient.auth.getUser();

      setIsOwnProfile(
        currentUser?.id === userId
      );

      const [
        profileResponse,
        threadsResponse,
        allThreadVotesResponse,
        repliesResponse,
        allReplyVotesResponse,
        allAcceptedResponse,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, display_name, email, avatar_url, bio"
          )
          .eq("id", userId)
          .single(),
        supabase
          .from("community_threads")
          .select(
            "id, title, content_kind, created_at"
          )
          .eq("user_id", userId)
          .eq("is_hidden", false)
          .order("created_at", {
            ascending: false,
          }),
        // Fetched flat and filtered
        // client-side against this
        // user's own thread IDs — an
        // embedded/nested Postgrest
        // filter here failed silently
        // in production earlier this
        // project, so this proven,
        // simpler pattern is used
        // instead.
        supabase
          .from("community_thread_votes")
          .select("thread_id"),
        supabase
          .from("community_replies")
          .select("id")
          .eq("user_id", userId),
        supabase
          .from("community_reply_votes")
          .select("reply_id"),
        supabase
          .from("community_threads")
          .select("accepted_reply_id")
          .not(
            "accepted_reply_id",
            "is",
            null
          ),
      ]);

      setProfile(
        profileResponse.data as Profile
      );
      setBioDraft(
        profileResponse.data?.bio || ""
      );

      const ownThreads =
        (threadsResponse.data ||
          []) as ThreadRow[];

      setThreads(ownThreads);

      const ownThreadIdSet = new Set(
        ownThreads.map((t) => t.id)
      );

      const ownReplyIdSet = new Set(
        (repliesResponse.data || []).map(
          (r) => r.id
        )
      );

      const threadUpvotesReceived = (
        allThreadVotesResponse.data ||
        []
      ).filter((v) =>
        ownThreadIdSet.has(v.thread_id)
      ).length;

      const replyUpvotesReceived = (
        allReplyVotesResponse.data ||
        []
      ).filter((v) =>
        ownReplyIdSet.has(v.reply_id)
      ).length;

      const acceptedCount = (
        allAcceptedResponse.data || []
      ).filter(
        (t) =>
          t.accepted_reply_id &&
          ownReplyIdSet.has(
            t.accepted_reply_id
          )
      ).length;

      const score = calculateReputation({
        threadCount: ownThreads.length,
        replyCount:
          repliesResponse.data
            ?.length || 0,
        threadUpvotesReceived,
        replyUpvotesReceived,
        acceptedAnswerCount:
          acceptedCount,
      });

      setReputation(score);
      setLoading(false);
    }

    load();
  }, [userId]);

  async function handleSaveBio() {
    setSavingBio(true);

    const { error } = await supabaseAuthClient
      .from("profiles")
      .update({ bio: bioDraft.trim() })
      .eq("id", userId);

    setSavingBio(false);

    if (!error) {
      setProfile((current) =>
        current
          ? {
              ...current,
              bio: bioDraft.trim(),
            }
          : current
      );
      setEditingBio(false);
    }
  }

  if (loading) {
    return (
      <CommunityLayout>
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />
      </CommunityLayout>
    );
  }

  if (!profile) {
    return (
      <CommunityLayout>
        <p className="text-zinc-400">
          User not found.
        </p>
      </CommunityLayout>
    );
  }

  const name =
    profile.display_name ||
    profile.email ||
    "Community Member";

  const badge = badgeForScore(reputation);

  return (
    <CommunityLayout>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-2xl font-bold text-orange-400">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-white">
              {name}
            </h1>

            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400">
                🏅 {badge}
              </span>
              <span className="text-xs text-zinc-500">
                {reputation} reputation
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {editingBio ? (
            <div>
              <textarea
                value={bioDraft}
                onChange={(e) =>
                  setBioDraft(
                    e.target.value
                  )
                }
                rows={2}
                placeholder="Write a short bio..."
                className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBio}
                  disabled={savingBio}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                >
                  {savingBio
                    ? "Saving..."
                    : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingBio(false)
                  }
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-400">
                {profile.bio ||
                  (isOwnProfile
                    ? "No bio yet."
                    : "")}
              </p>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingBio(true)
                  }
                  className="mt-1 text-xs text-orange-500 hover:text-orange-400"
                >
                  {profile.bio
                    ? "Edit bio"
                    : "Add a bio"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-white">
        Posts ({threads.length})
      </h2>

      {threads.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No posts yet.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/discussions/${thread.id}`}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 transition hover:border-orange-500/40"
            >
              <span>
                {CONTENT_KIND_ICON[
                  thread.content_kind
                ] || "💬"}
              </span>
              <span className="text-sm text-white">
                {thread.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </CommunityLayout>
  );
}
