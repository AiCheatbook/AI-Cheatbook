"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type PostRow = {
  id: string;
  kind: "poll" | string; // content_kind for threads, "poll" for polls
  title: string;
  authorName: string;
  groupName: string | null;
  createdAt: string;
  isHidden: boolean;
  canDelete: boolean;
  href: string;
};

const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "discussion", label: "Discussions" },
  { value: "question", label: "Questions" },
  { value: "poll", label: "Polls" },
  { value: "prompt", label: "Prompts" },
  { value: "learning", label: "Learning" },
  { value: "resource", label: "Resources" },
  { value: "discovery", label: "Discoveries" },
];

export default function AdminPostsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);

    const [threadsRes, pollsRes] = await Promise.all([
      supabaseAuthClient
        .from("community_threads")
        .select(
          `
            id, title, content_kind, created_at, is_hidden,
            profiles ( display_name, email ),
            groups ( name )
          `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAuthClient
        .from("community_polls")
        .select(
          `
            id, question, created_at, is_hidden,
            profiles ( display_name, email ),
            groups ( name )
          `
        )
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (threadsRes.error) {
      console.error(
        "AdminPostsPage: failed to load threads:",
        threadsRes.error.message
      );
    }
    if (pollsRes.error) {
      console.error(
        "AdminPostsPage: failed to load polls:",
        pollsRes.error.message
      );
    }

    const threadRows = (
      (threadsRes.data || []) as unknown as Array<{
        id: string;
        title: string;
        content_kind: string;
        created_at: string;
        is_hidden: boolean;
        profiles: { display_name: string | null; email: string | null } | null;
        groups: { name: string } | null;
      }>
    ).map((t) => ({
      id: t.id,
      kind: t.content_kind,
      title: t.title,
      authorName:
        t.profiles?.display_name || t.profiles?.email || "Community Member",
      groupName: t.groups?.name || null,
      createdAt: t.created_at,
      isHidden: t.is_hidden,
      canDelete: true,
      href: `/discussions/${t.id}`,
    }));

    const pollRows = (
      (pollsRes.data || []) as unknown as Array<{
        id: string;
        question: string;
        created_at: string;
        is_hidden: boolean;
        profiles: { display_name: string | null; email: string | null } | null;
        groups: { name: string } | null;
      }>
    ).map((p) => ({
      id: p.id,
      kind: "poll",
      title: p.question,
      authorName:
        p.profiles?.display_name || p.profiles?.email || "Community Member",
      groupName: p.groups?.name || null,
      createdAt: p.created_at,
      isHidden: p.is_hidden,
      canDelete: false,
      href: `/community/polls/${p.id}`,
    }));

    const combined = [...threadRows, ...pollRows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setPosts(combined);
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

      setMyUserId(user.id);
      setChecking(false);
      await loadPosts();
    }

    init();
  }, [router]);

  async function logAction(
    action: string,
    targetId: string,
    targetType: string,
    details: Record<string, unknown>
  ) {
    const { error } = await supabaseAuthClient.from("audit_log").insert({
      actor_id: myUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });

    if (error) {
      console.error("AdminPostsPage: failed to write audit log:", error.message);
    }
  }

  async function toggleHide(post: PostRow) {
    setBusyId(post.id);

    const table = post.kind === "poll" ? "community_polls" : "community_threads";

    const { error } = await supabaseAuthClient
      .from(table)
      .update({ is_hidden: !post.isHidden })
      .eq("id", post.id);

    if (!error) {
      await logAction(
        post.isHidden ? "post_unhidden" : "post_hidden",
        post.id,
        table,
        { title: post.title }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isHidden: !p.isHidden } : p
        )
      );
    } else {
      console.error("AdminPostsPage: failed to toggle hide:", error.message);
    }

    setBusyId(null);
  }

  async function deletePost(post: PostRow) {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;

    setBusyId(post.id);

    const { error } = await supabaseAuthClient
      .from("community_threads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", post.id);

    if (!error) {
      await logAction("post_deleted", post.id, "community_threads", {
        title: post.title,
      });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } else {
      console.error("AdminPostsPage: failed to delete post:", error.message);
    }

    setBusyId(null);
  }

  const communities = useMemo(
    () =>
      Array.from(
        new Set(posts.map((p) => p.groupName).filter(Boolean) as string[])
      ).sort(),
    [posts]
  );

  const filtered = posts.filter((p) => {
    if (typeFilter !== "all" && p.kind !== typeFilter) return false;

    if (communityFilter === "main" && p.groupName) return false;
    if (
      communityFilter !== "all" &&
      communityFilter !== "main" &&
      p.groupName !== communityFilter
    )
      return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
    );
  });

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white">Posts Management</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Every discussion, question, poll, prompt, resource and discovery —
        from the main feed and every community — in one place.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={communityFilter}
          onChange={(e) => setCommunityFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">All (main feed + communities)</option>
          <option value="main">Main Feed Only</option>
          {communities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or author..."
          className="w-64 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-brand"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Post</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Community</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  No posts match that filter.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((p) => (
                <tr key={`${p.kind}-${p.id}`} className="border-t border-white/5">
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={p.href}
                      className="truncate text-white hover:text-brand-text"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{p.kind}</td>
                  <td className="px-4 py-3 text-neutral-400">{p.authorName}</td>
                  <td className="px-4 py-3 text-neutral-400">
                    {p.groupName || (
                      <span className="text-neutral-600">Main Feed</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.isHidden
                          ? "bg-red-500/10 text-red-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {p.isHidden ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => toggleHide(p)}
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:border-brand/50 disabled:opacity-40"
                      >
                        {p.isHidden ? "Unhide" : "Hide"}
                      </button>

                      {p.canDelete && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => deletePost(p)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:border-red-400 hover:text-red-400 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-600">
        Showing up to 300 most recent items per type. Polls can be hidden but
        not deleted here yet — they don&apos;t have a soft-delete column.
      </p>
    </div>
  );
}
