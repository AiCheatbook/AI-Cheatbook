"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { trendingScore } from "@/lib/community/trending";

type ThreadRow = {
  id: string;
  title: string;
  content_kind: string;
  created_at: string;
  is_trending: boolean;
  voteCount: number;
  replyCount: number;
};

type PromptRow = {
  id: string;
  title: string;
  is_trending: boolean;
};

type ArtworkRow = {
  id: string;
  title: string;
  status: string;
  is_trending: boolean;
};

type Tab = "posts" | "prompts" | "artwork";

export default function AdminTrendingPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [artwork, setArtwork] = useState<ArtworkRow[]>([]);

  async function loadAll() {
    setLoading(true);

    const [threadsRes, votesRes, repliesRes, promptsRes, artworkRes] =
      await Promise.all([
        supabaseAuthClient
          .from("community_threads")
          .select("id, title, content_kind, created_at, is_trending")
          .eq("is_hidden", false)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseAuthClient.from("community_thread_votes").select("thread_id"),
        supabaseAuthClient.from("community_replies").select("thread_id"),
        supabaseAuthClient
          .from("library_items")
          .select("id, title, is_trending")
          .is("deleted_at", null)
          .order("title", { ascending: true }),
        supabaseAuthClient
          .from("community_artwork")
          .select("id, title, status, is_trending")
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ]);

    if (threadsRes.error) {
      console.error(
        "AdminTrendingPage: failed to load threads:",
        threadsRes.error.message
      );
    }
    if (promptsRes.error) {
      console.error(
        "AdminTrendingPage: failed to load prompts:",
        promptsRes.error.message
      );
    }
    if (artworkRes.error) {
      console.error(
        "AdminTrendingPage: failed to load artwork:",
        artworkRes.error.message
      );
    }

    const voteCounts: Record<string, number> = {};
    for (const v of votesRes.data || []) {
      voteCounts[v.thread_id] = (voteCounts[v.thread_id] || 0) + 1;
    }

    const replyCounts: Record<string, number> = {};
    for (const r of repliesRes.data || []) {
      replyCounts[r.thread_id] = (replyCounts[r.thread_id] || 0) + 1;
    }

    const threadRows = ((threadsRes.data || []) as ThreadRow[]).map((t) => ({
      ...t,
      voteCount: voteCounts[t.id] || 0,
      replyCount: replyCounts[t.id] || 0,
    }));

    // Show highest-scoring first, same ranking the live Trending
    // tab uses, so an admin sees what the algorithm would pick.
    threadRows.sort(
      (a, b) =>
        trendingScore(b.voteCount, b.replyCount, b.created_at) -
        trendingScore(a.voteCount, a.replyCount, a.created_at)
    );

    setThreads(threadRows);
    setPrompts((promptsRes.data || []) as PromptRow[]);
    setArtwork((artworkRes.data || []) as ArtworkRow[]);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabaseAuthClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setChecking(false);
      await loadAll();
    }

    init();
  }, [router]);

  async function toggleThread(t: ThreadRow) {
    setBusyId(t.id);
    const { error } = await supabaseAuthClient
      .from("community_threads")
      .update({ is_trending: !t.is_trending })
      .eq("id", t.id);

    if (!error) {
      setThreads((prev) =>
        prev.map((row) =>
          row.id === t.id ? { ...row, is_trending: !row.is_trending } : row
        )
      );
    } else {
      console.error("AdminTrendingPage: failed to toggle thread:", error.message);
    }
    setBusyId(null);
  }

  async function togglePrompt(p: PromptRow) {
    setBusyId(p.id);
    const { error } = await supabaseAuthClient
      .from("library_items")
      .update({ is_trending: !p.is_trending })
      .eq("id", p.id);

    if (!error) {
      setPrompts((prev) =>
        prev.map((row) =>
          row.id === p.id ? { ...row, is_trending: !row.is_trending } : row
        )
      );
    } else {
      console.error("AdminTrendingPage: failed to toggle prompt:", error.message);
    }
    setBusyId(null);
  }

  async function toggleArtwork(a: ArtworkRow) {
    setBusyId(a.id);
    const { error } = await supabaseAuthClient
      .from("community_artwork")
      .update({ is_trending: !a.is_trending })
      .eq("id", a.id);

    if (!error) {
      setArtwork((prev) =>
        prev.map((row) =>
          row.id === a.id ? { ...row, is_trending: !row.is_trending } : row
        )
      );
    } else {
      console.error("AdminTrendingPage: failed to toggle artwork:", error.message);
    }
    setBusyId(null);
  }

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white">Trending Management</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manually pin content to the top of its Trending section, overriding
        the recency+engagement algorithm. Community Posts are ranked here
        exactly as the live Trending tab on the homepage ranks them.
      </p>

      <div className="mt-4 flex gap-2 border-b border-white/10">
        {(
          [
            { id: "posts", label: `Community Posts (${threads.length})` },
            { id: "prompts", label: `Prompts (${prompts.length})` },
            { id: "artwork", label: `Artwork (${artwork.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-brand text-white"
                : "text-neutral-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-4 text-sm text-neutral-500">Loading...</p>
      )}

      {!loading && tab === "posts" && (
        <div className="mt-4 space-y-2">
          {threads.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/discussions/${t.id}`}
                  className="truncate text-sm font-medium text-white hover:text-brand-text"
                >
                  {t.title}
                </Link>
                <p className="text-xs text-neutral-500">
                  {t.content_kind} · ▲{t.voteCount} · 💬{t.replyCount}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === t.id}
                onClick={() => toggleThread(t)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  t.is_trending
                    ? "bg-brand text-zinc-900"
                    : "border border-white/10 text-neutral-300 hover:border-brand/50"
                }`}
              >
                {t.is_trending ? "🔥 Pinned" : "Pin as Trending"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "prompts" && (
        <div className="mt-4 space-y-2">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3"
            >
              <span className="truncate text-sm text-white">{p.title}</span>
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => togglePrompt(p)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  p.is_trending
                    ? "bg-brand text-zinc-900"
                    : "border border-white/10 text-neutral-300 hover:border-brand/50"
                }`}
              >
                {p.is_trending ? "🔥 Pinned" : "Pin as Trending"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "artwork" && (
        <div className="mt-4 space-y-2">
          {artwork.length === 0 && (
            <p className="text-sm text-neutral-500">
              No published artwork yet.
            </p>
          )}
          {artwork.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3"
            >
              <span className="truncate text-sm text-white">{a.title}</span>
              <button
                type="button"
                disabled={busyId === a.id}
                onClick={() => toggleArtwork(a)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  a.is_trending
                    ? "bg-brand text-zinc-900"
                    : "border border-white/10 text-neutral-300 hover:border-brand/50"
                }`}
              >
                {a.is_trending ? "🔥 Pinned" : "Pin as Trending"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
