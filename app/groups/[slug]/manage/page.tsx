"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLevelForPoints } from "@/lib/community/levels";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "invite_only";
  cover_image_url: string | null;
  owner_id: string;
  member_count: number;
  guidelines: string | null;
  posting_permission: "all_members" | "owner_and_authorized";
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  display_name: string | null;
  email: string | null;
  points: number;
};

type BanRow = {
  id: string;
  user_id: string;
  reason: string | null;
  is_permanent: boolean;
  expires_at: string | null;
  created_at: string;
  display_name: string | null;
  email: string | null;
};

type PostRow = {
  id: string;
  kind: "thread" | "poll";
  title: string;
  content_kind: string;
  created_at: string;
  is_hidden: boolean;
  authorName: string;
};

type Tab =
  | "overview"
  | "members"
  | "posts"
  | "permissions"
  | "guidelines";

const CATEGORIES = [
  "General AI",
  "Prompt Engineering",
  "AI Video",
  "AI Image",
  "AI Coding",
  "AI Business",
  "AI News & Research",
];

const BAN_DURATIONS = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Permanent", ms: null },
];

function computeExpiresAt(durationMs: number | null): string | null {
  if (!durationMs) return null;
  return new Date(Date.now() + durationMs).toISOString();
}

export default function GroupManagePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pending, setPending] = useState<MemberRow[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [authorizedIds, setAuthorizedIds] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Settings form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState<"public" | "invite_only">(
    "public"
  );
  const [guidelines, setGuidelines] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  async function logAction(
    action: string,
    targetId: string,
    details: Record<string, unknown>
  ) {
    const { error } = await supabaseAuthClient.from("audit_log").insert({
      actor_id: userId,
      action,
      target_type: "group",
      target_id: targetId,
      details,
    });

    if (error) {
      console.error("GroupManagePage: failed to write audit log:", error.message);
    }
  }

  async function loadAll(groupId: string) {
    const [
      membersRes,
      bansRes,
      authorizedRes,
      postsRes,
      pollsRes,
    ] = await Promise.all([
      supabaseAuthClient
        .from("group_members")
        .select("id, user_id, role, status, points, profiles(display_name, email)")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true }),
      supabaseAuthClient
        .from("group_bans")
        .select(
          "id, user_id, reason, is_permanent, expires_at, created_at, profiles(display_name, email)"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
      supabaseAuthClient
        .from("group_authorized_posters")
        .select("user_id")
        .eq("group_id", groupId),
      supabaseAuthClient
        .from("community_threads")
        .select(
          "id, title, content_kind, created_at, is_hidden, profiles(display_name, email)"
        )
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabaseAuthClient
        .from("community_polls")
        .select(
          "id, question, created_at, is_hidden, profiles(display_name, email)"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
    ]);

    const allMembers = (
      (membersRes.data || []) as unknown as Array<{
        id: string;
        user_id: string;
        role: string;
        status: string;
        points: number;
        profiles: { display_name: string | null; email: string | null } | null;
      }>
    ).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      points: m.points || 0,
      display_name: m.profiles?.display_name || null,
      email: m.profiles?.email || null,
    }));

    setMembers(allMembers.filter((m) => m.status === "active"));
    setPending(allMembers.filter((m) => m.status === "pending"));

    setBans(
      (
        (bansRes.data || []) as unknown as Array<{
          id: string;
          user_id: string;
          reason: string | null;
          is_permanent: boolean;
          expires_at: string | null;
          created_at: string;
          profiles: { display_name: string | null; email: string | null } | null;
        }>
      ).map((b) => ({
        id: b.id,
        user_id: b.user_id,
        reason: b.reason,
        is_permanent: b.is_permanent,
        expires_at: b.expires_at,
        created_at: b.created_at,
        display_name: b.profiles?.display_name || null,
        email: b.profiles?.email || null,
      }))
    );

    setAuthorizedIds(
      new Set((authorizedRes.data || []).map((r) => r.user_id))
    );

    const threadRows = (
      (postsRes.data || []) as unknown as Array<{
        id: string;
        title: string;
        content_kind: string;
        created_at: string;
        is_hidden: boolean;
        profiles: { display_name: string | null; email: string | null } | null;
      }>
    ).map((p) => ({
      id: p.id,
      kind: "thread" as const,
      title: p.title,
      content_kind: p.content_kind,
      created_at: p.created_at,
      is_hidden: p.is_hidden,
      authorName:
        p.profiles?.display_name || p.profiles?.email || "Community Member",
    }));

    const pollRows = (
      (pollsRes.data || []) as unknown as Array<{
        id: string;
        question: string;
        created_at: string;
        is_hidden: boolean;
        profiles: { display_name: string | null; email: string | null } | null;
      }>
    ).map((p) => ({
      id: p.id,
      kind: "poll" as const,
      title: p.question,
      content_kind: "poll",
      created_at: p.created_at,
      is_hidden: p.is_hidden,
      authorName:
        p.profiles?.display_name || p.profiles?.email || "Community Member",
    }));

    setPosts(
      [...threadRows, ...pollRows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
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

      setUserId(user.id);

      const { data: groupRow, error: groupError } = await supabaseAuthClient
        .from("groups")
        .select(
          "id, slug, name, description, category, visibility, cover_image_url, owner_id, member_count, guidelines, posting_permission"
        )
        .eq("slug", slug)
        .maybeSingle();

      if (groupError) {
        console.error("GroupManagePage: failed to load group:", groupError.message);
      }

      if (!groupRow || groupRow.owner_id !== user.id) {
        setForbidden(true);
        setChecking(false);
        return;
      }

      const g = groupRow as Group;
      setGroup(g);
      setName(g.name);
      setDescription(g.description || "");
      setCategory(g.category || CATEGORIES[0]);
      setVisibility(g.visibility);
      setGuidelines(g.guidelines || "");

      await loadAll(g.id);
      setChecking(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function syncMemberCount() {
    if (!group) return;
    const { count } = await supabaseAuthClient
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "active");

    await supabaseAuthClient
      .from("groups")
      .update({ member_count: count || 0 })
      .eq("id", group.id);
  }

  async function approveRequest(m: MemberRow) {
    setBusyId(m.id);
    const { error } = await supabaseAuthClient
      .from("group_members")
      .update({ status: "active" })
      .eq("id", m.id);

    if (!error && group) {
      await syncMemberCount();
      await logAction("group_member_approved", m.user_id, {
        group_id: group.id,
      });
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function rejectRequest(m: MemberRow) {
    setBusyId(m.id);
    const { error } = await supabaseAuthClient
      .from("group_members")
      .delete()
      .eq("id", m.id);

    if (!error && group) {
      await logAction("group_member_rejected", m.user_id, {
        group_id: group.id,
      });
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function toggleModerator(m: MemberRow) {
    setBusyId(m.id);
    const newRole = m.role === "moderator" ? "member" : "moderator";

    const { error } = await supabaseAuthClient
      .from("group_members")
      .update({ role: newRole })
      .eq("id", m.id);

    if (!error && group) {
      await logAction("group_member_role_changed", m.user_id, {
        group_id: group.id,
        to: newRole,
      });
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function removeMember(m: MemberRow) {
    if (!confirm(`Remove ${m.display_name || m.email} from this community?`))
      return;

    setBusyId(m.id);
    const { error } = await supabaseAuthClient
      .from("group_members")
      .delete()
      .eq("id", m.id);

    if (!error && group) {
      await syncMemberCount();
      await logAction("group_member_removed", m.user_id, {
        group_id: group.id,
      });
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function banMember(m: MemberRow, durationMs: number | null) {
    if (!group || !userId) return;
    setBusyId(m.id);

    const expiresAt = computeExpiresAt(durationMs);

    const { error: banError } = await supabaseAuthClient
      .from("group_bans")
      .upsert(
        {
          group_id: group.id,
          user_id: m.user_id,
          banned_by: userId,
          is_permanent: !durationMs,
          expires_at: expiresAt,
        },
        { onConflict: "group_id,user_id" }
      );

    if (!banError) {
      await supabaseAuthClient
        .from("group_members")
        .delete()
        .eq("id", m.id);

      await syncMemberCount();
      await logAction("group_member_banned", m.user_id, {
        group_id: group.id,
        permanent: !durationMs,
        expires_at: expiresAt,
      });
      await loadAll(group.id);
    } else {
      console.error("GroupManagePage: failed to ban member:", banError.message);
    }

    setBusyId(null);
  }

  async function unban(b: BanRow) {
    setBusyId(b.id);
    const { error } = await supabaseAuthClient
      .from("group_bans")
      .delete()
      .eq("id", b.id);

    if (!error && group) {
      await logAction("group_member_unbanned", b.user_id, {
        group_id: group.id,
      });
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function toggleAuthorizedPoster(m: MemberRow) {
    if (!group) return;
    setBusyId(m.id);

    const isAuthorized = authorizedIds.has(m.user_id);

    if (isAuthorized) {
      await supabaseAuthClient
        .from("group_authorized_posters")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", m.user_id);
    } else {
      await supabaseAuthClient.from("group_authorized_posters").insert({
        group_id: group.id,
        user_id: m.user_id,
      });
    }

    await logAction(
      isAuthorized
        ? "group_authorized_poster_removed"
        : "group_authorized_poster_added",
      m.user_id,
      { group_id: group.id }
    );
    await loadAll(group.id);
    setBusyId(null);
  }

  async function changePostingPermission(
    value: "all_members" | "owner_and_authorized"
  ) {
    if (!group) return;

    const { error } = await supabaseAuthClient
      .from("groups")
      .update({ posting_permission: value })
      .eq("id", group.id);

    if (!error) {
      setGroup({ ...group, posting_permission: value });
      await logAction("group_posting_permission_changed", group.id, {
        to: value,
      });
    }
  }

  async function toggleHidePost(p: PostRow) {
    setBusyId(p.id);
    const table = p.kind === "poll" ? "community_polls" : "community_threads";
    const { error } = await supabaseAuthClient
      .from(table)
      .update({ is_hidden: !p.is_hidden })
      .eq("id", p.id);

    if (!error && group) {
      await logAction(
        p.is_hidden ? "group_post_unhidden" : "group_post_hidden",
        p.id,
        { group_id: group.id }
      );
      await loadAll(group.id);
    }
    setBusyId(null);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setSavingSettings(true);

    const { error } = await supabaseAuthClient
      .from("groups")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        category,
        visibility,
        guidelines: guidelines.trim() || null,
      })
      .eq("id", group.id);

    if (!error) {
      setGroup({
        ...group,
        name: name.trim(),
        description: description.trim() || null,
        category,
        visibility,
        guidelines: guidelines.trim() || null,
      });
      await logAction("group_settings_updated", group.id, {});
    } else {
      console.error("GroupManagePage: failed to save settings:", error.message);
    }

    setSavingSettings(false);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  if (forbidden || !group) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Only this community&apos;s owner can access its management panel.
          </p>
          <Link href="/groups" className="mt-3 inline-block text-brand-text">
            ← Back to Communities
          </Link>
        </div>
      </main>
    );
  }

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.display_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/groups/${group.slug}`}
          className="text-sm text-zinc-500 hover:text-brand-text"
        >
          ← Back to {group.name}
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Manage {group.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          This panel is scoped to this community only — it doesn&apos;t give
          you access to the main AI Cheatbook admin panel or any other
          community.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "members", label: `Members (${members.length})` },
              { id: "posts", label: `Posts (${posts.length})` },
              { id: "permissions", label: "Posting Permissions" },
              { id: "guidelines", label: "Guidelines & Settings" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium ${
                tab === t.id
                  ? "border-b-2 border-brand text-zinc-900"
                  : "text-zinc-500"
              }`}
            >
              {t.label}
            </button>
          ))}

          <Link
            href={`/groups/${slug}/manage/courses`}
            className="px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Courses
          </Link>

          <Link
            href={`/groups/${slug}/manage/events`}
            className="px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Events
          </Link>
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Members" value={group.member_count} />
            <StatCard label="Pending Requests" value={pending.length} />
            <StatCard label="Posts" value={posts.length} />
            <StatCard label="Active Bans" value={bans.length} />
          </div>
        )}

        {tab === "members" && (
          <div className="mt-6 space-y-6">
            {pending.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Pending Requests ({pending.length})
                </h3>
                <div className="mt-2 space-y-2">
                  {pending.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3"
                    >
                      <span className="text-sm">
                        {m.display_name || m.email}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => approveRequest(m)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => rejectRequest(m)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Members ({members.length})
                </h3>
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand"
                />
              </div>

              <div className="mt-2 space-y-2">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {m.display_name || m.email}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        Lvl {getLevelForPoints(m.points).level} · {m.points} pts
                      </span>
                      {m.role === "moderator" && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          moderator
                        </span>
                      )}
                      {authorizedIds.has(m.user_id) && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand-text">
                          authorized poster
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => toggleModerator(m)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500 disabled:opacity-40"
                      >
                        {m.role === "moderator"
                          ? "Remove Mod"
                          : "Make Moderator"}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => toggleAuthorizedPoster(m)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500 disabled:opacity-40"
                      >
                        {authorizedIds.has(m.user_id)
                          ? "Unauthorize"
                          : "Authorize Poster"}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => removeMember(m)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                      >
                        Remove
                      </button>

                      <div className="group relative">
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
                        >
                          Ban ▾
                        </button>
                        <div className="absolute right-0 top-full z-10 hidden w-32 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg group-hover:block">
                          {BAN_DURATIONS.map((d) => (
                            <button
                              key={d.label}
                              type="button"
                              onClick={() => banMember(m, d.ms)}
                              className="block w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {bans.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Banned Users ({bans.length})
                </h3>
                <div className="mt-2 space-y-2">
                  {bans.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                      <div className="text-sm">
                        <span>{b.display_name || b.email}</span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {b.is_permanent
                            ? "Permanent"
                            : `Until ${new Date(
                                b.expires_at!
                              ).toLocaleString()}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => unban(b)}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-brand/50 disabled:opacity-50"
                      >
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "posts" && (
          <div className="mt-6 space-y-2">
            {posts.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
                No posts in this community yet.
              </div>
            )}

            {posts.map((p) => (
              <div
                key={`${p.kind}-${p.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={
                      p.kind === "poll"
                        ? `/community/polls/${p.id}`
                        : `/discussions/${p.id}`
                    }
                    className="truncate text-sm font-medium text-zinc-900 hover:text-brand-text"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {p.authorName} · {p.content_kind}
                    {p.is_hidden && (
                      <span className="ml-2 text-red-500">Hidden</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => toggleHidePost(p)}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-500 disabled:opacity-50"
                >
                  {p.is_hidden ? "Unhide" : "Hide"}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "permissions" && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-900">
              Who can post in this community?
            </h3>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changePostingPermission("all_members")}
                className={`rounded-xl border px-4 py-3 text-left text-sm ${
                  group.posting_permission === "all_members"
                    ? "border-brand bg-brand/10"
                    : "border-zinc-200"
                }`}
              >
                <span className="block font-semibold">All Members</span>
                <span className="text-xs text-zinc-600">
                  Any active member can create posts
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  changePostingPermission("owner_and_authorized")
                }
                className={`rounded-xl border px-4 py-3 text-left text-sm ${
                  group.posting_permission === "owner_and_authorized"
                    ? "border-brand bg-brand/10"
                    : "border-zinc-200"
                }`}
              >
                <span className="block font-semibold">
                  Owner + Authorized Only
                </span>
                <span className="text-xs text-zinc-600">
                  Only you and members you authorize can post
                </span>
              </button>
            </div>

            <p className="mt-4 text-sm text-zinc-600">
              Manage who&apos;s authorized from the Members tab (each member
              has an &quot;Authorize Poster&quot; button).
            </p>
          </div>
        )}

        {tab === "guidelines" && (
          <form onSubmit={saveSettings} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Community name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-brand"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Who can join?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    visibility === "public"
                      ? "border-brand bg-brand/10"
                      : "border-zinc-200"
                  }`}
                >
                  🌐 Public
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("invite_only")}
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${
                    visibility === "invite_only"
                      ? "border-brand bg-brand/10"
                      : "border-zinc-200"
                  }`}
                >
                  🔒 Invite-only
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Community Guidelines
              </label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                rows={6}
                placeholder="e.g. Stay relevant, give constructive feedback, no spam..."
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark disabled:opacity-50"
            >
              {savingSettings ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
