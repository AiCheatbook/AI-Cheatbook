"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import PostComposer from "@/components/community/PostComposer";
import DiscussionCard from "@/components/community/cards/DiscussionCard";
import CommunitySwitcher from "@/components/community/CommunitySwitcher";

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
  posting_permission: "all_members" | "owner_and_authorized";
  guidelines: string | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  display_name: string | null;
  email: string | null;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  content_kind: string;
  created_at: string;
  authorName: string;
  voteCount: number;
  replyCount: number;
  mediaUrls: string[] | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
};

type Tab = "feed" | "members";

export default function GroupDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [myMembership, setMyMembership] = useState<MemberRow | null>(null);
  const [myBan, setMyBan] = useState<{
    is_permanent: boolean;
    expires_at: string | null;
  } | null>(null);
  const [isAuthorizedPoster, setIsAuthorizedPoster] = useState(false);
  const [tab, setTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pending, setPending] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinBusy, setJoinBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const isOwner = Boolean(userId && group && userId === group.owner_id);
  const isActiveMember =
    isOwner || myMembership?.status === "active";
  const canPost =
    isOwner ||
    (isActiveMember &&
      (group?.posting_permission !== "owner_and_authorized" ||
        isAuthorizedPoster));

  async function loadEverything() {
    const {
      data: { user },
    } = await supabaseAuthClient.auth.getUser();
    setUserId(user?.id || null);

    const { data: groupRow, error: groupError } = await supabaseAuthClient
      .from("groups")
      .select(
        "id, slug, name, description, category, visibility, cover_image_url, owner_id, member_count, posting_permission, guidelines"
      )
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (groupError) {
      console.error(
        "GroupDetailPage: failed to load group:",
        groupError.message
      );
    }

    if (!groupRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setGroup(groupRow as Group);

    const [membershipRes, membersRes, postsRes, banRes, authorizedRes] =
      await Promise.all([
      user
        ? supabaseAuthClient
            .from("group_members")
            .select(
              "id, user_id, role, status, joined_at, profiles(display_name, email)"
            )
            .eq("group_id", groupRow.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAuthClient
        .from("group_members")
        .select(
          "id, user_id, role, status, joined_at, profiles(display_name, email)"
        )
        .eq("group_id", groupRow.id)
        .order("joined_at", { ascending: true }),
      supabaseAuthClient
        .from("community_threads")
        .select(
          `
            id, title, body, category, content_kind, created_at,
            media_urls, video_url, youtube_url,
            profiles ( display_name, email )
          `
        )
        .eq("group_id", groupRow.id)
        .eq("is_hidden", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      user
        ? supabaseAuthClient
            .from("group_bans")
            .select("is_permanent, expires_at")
            .eq("group_id", groupRow.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabaseAuthClient
            .from("group_authorized_posters")
            .select("id")
            .eq("group_id", groupRow.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (banRes.data) {
      const notExpired =
        banRes.data.is_permanent ||
        (banRes.data.expires_at &&
          new Date(banRes.data.expires_at) > new Date());

      setMyBan(notExpired ? banRes.data : null);
    } else {
      setMyBan(null);
    }

    setIsAuthorizedPoster(Boolean(authorizedRes.data));

    if (membershipRes.data) {
      const m = membershipRes.data as unknown as {
        id: string;
        user_id: string;
        role: string;
        status: string;
        joined_at: string;
        profiles: { display_name: string | null; email: string | null } | null;
      };
      setMyMembership({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        display_name: m.profiles?.display_name || null,
        email: m.profiles?.email || null,
      });
    }

    const allMembers = (
      (membersRes.data || []) as unknown as Array<{
        id: string;
        user_id: string;
        role: string;
        status: string;
        joined_at: string;
        profiles: { display_name: string | null; email: string | null } | null;
      }>
    ).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      display_name: m.profiles?.display_name || null,
      email: m.profiles?.email || null,
    }));

    setMembers(allMembers.filter((m) => m.status === "active"));
    setPending(allMembers.filter((m) => m.status === "pending"));

    setPosts(
      (
        (postsRes.data || []) as unknown as Array<{
          id: string;
          title: string;
          body: string;
          category: string;
          content_kind: string;
          created_at: string;
          media_urls: string[] | null;
          video_url: string | null;
          youtube_url: string | null;
          profiles: { display_name: string | null; email: string | null } | null;
        }>
      ).map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        category: p.category,
        content_kind: p.content_kind,
        created_at: p.created_at,
        authorName:
          p.profiles?.display_name || p.profiles?.email || "Community Member",
        voteCount: 0,
        replyCount: 0,
        mediaUrls: p.media_urls,
        videoUrl: p.video_url,
        youtubeUrl: p.youtube_url,
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      if (slug) await loadEverything();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function syncMemberCount(groupId: string) {
    const { count } = await supabaseAuthClient
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("status", "active");

    await supabaseAuthClient
      .from("groups")
      .update({ member_count: count || 0 })
      .eq("id", groupId);
  }

  async function handleJoin() {
    if (!userId || !group || joinBusy) return;
    setJoinBusy(true);

    const { data: myProfile } = await supabaseAuthClient
      .from("profiles")
      .select("is_disabled")
      .eq("id", userId)
      .single();

    if (myProfile?.is_disabled) {
      alert(
        "Your account has been disabled and can't join communities right now."
      );
      setJoinBusy(false);
      return;
    }

    const status = group.visibility === "public" ? "active" : "pending";

    const { data: inserted, error } = await supabaseAuthClient
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
        role: "member",
        status,
      })
      .select("id, user_id, role, status, joined_at")
      .single();

    if (!error && inserted) {
      setMyMembership({
        ...inserted,
        display_name: null,
        email: null,
      });

      if (status === "active") {
        await syncMemberCount(group.id);
        setGroup((g) => (g ? { ...g, member_count: g.member_count + 1 } : g));
      }
    } else if (error) {
      console.error("GroupDetailPage: failed to join:", error.message);
    }

    setJoinBusy(false);
  }

  async function handleLeave() {
    if (!userId || !group || !myMembership || joinBusy) return;
    setJoinBusy(true);

    const { error } = await supabaseAuthClient
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", userId);

    if (!error) {
      const wasActive = myMembership.status === "active";
      setMyMembership(null);

      if (wasActive) {
        await syncMemberCount(group.id);
        setGroup((g) =>
          g ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g
        );
      }
    } else {
      console.error("GroupDetailPage: failed to leave:", error.message);
    }

    setJoinBusy(false);
  }

  async function approveRequest(memberRowId: string) {
    const { error } = await supabaseAuthClient
      .from("group_members")
      .update({ status: "active" })
      .eq("id", memberRowId);

    if (error) {
      console.error("GroupDetailPage: failed to approve request:", error.message);
      return;
    }

    if (group) await syncMemberCount(group.id);
    await loadEverything();
  }

  async function rejectRequest(memberRowId: string) {
    const { error } = await supabaseAuthClient
      .from("group_members")
      .delete()
      .eq("id", memberRowId);

    if (error) {
      console.error("GroupDetailPage: failed to reject request:", error.message);
      return;
    }

    await loadEverything();
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">Community not found</h1>
          <Link href="/groups" className="mt-2 inline-block text-brand-text">
            ← Back to all communities
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !group) {
    return (
      <main className="min-h-screen bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-40 rounded-2xl bg-zinc-100" />
          <div className="h-24 rounded-2xl bg-zinc-100" />
        </div>
      </main>
    );
  }

  if (myBan && !isOwner) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center text-zinc-900">
        <div>
          <h1 className="text-xl font-semibold">
            You&apos;ve been banned from {group.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {myBan.is_permanent
              ? "This is a permanent ban from this community only — your AI Cheatbook account is unaffected."
              : `You can rejoin after ${new Date(
                  myBan.expires_at!
                ).toLocaleString()}. Your AI Cheatbook account is unaffected.`}
          </p>
          <Link href="/groups" className="mt-3 inline-block text-brand-text">
            ← Back to Communities
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <CommunitySwitcher />
        </div>

        {group.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.cover_image_url}
            alt=""
            className="h-40 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-brand-light text-5xl">
            🤝
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              {group.visibility === "invite_only" && (
                <span className="text-sm" title="Invite-only">
                  🔒
                </span>
              )}
            </div>

            {group.description && (
              <p className="mt-1 max-w-xl text-sm text-zinc-600">
                {group.description}
              </p>
            )}

            <p className="mt-2 text-xs text-zinc-500">
              {group.member_count}{" "}
              {group.member_count === 1 ? "member" : "members"}
              {group.category && ` · ${group.category}`}
            </p>

            {group.guidelines && (
              <details className="mt-2 max-w-xl text-xs text-zinc-600">
                <summary className="cursor-pointer font-medium text-zinc-700">
                  Community Guidelines
                </summary>
                <p className="mt-1 whitespace-pre-wrap">{group.guidelines}</p>
              </details>
            )}
          </div>

          {!isOwner && userId && (
            <div>
              {!myMembership && (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joinBusy}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {group.visibility === "public" ? "Join" : "Request to Join"}
                </button>
              )}

              {myMembership?.status === "pending" && (
                <span className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm text-zinc-600">
                  Request Pending
                </span>
              )}

              {myMembership?.status === "active" && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={joinBusy}
                  className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                >
                  Leave
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-brand/40 bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-text">
                You own this community
              </span>
              <Link
                href={`/groups/${group.slug}/manage`}
                className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-brand/50"
              >
                Manage
              </Link>
            </div>
          )}

          {!userId && (
            <Link
              href="/login"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
            >
              Log in to Join
            </Link>
          )}
        </div>

        <div className="mt-6 flex gap-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setTab("feed")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "feed"
                ? "border-b-2 border-brand text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            Feed
          </button>
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "members"
                ? "border-b-2 border-brand text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            Members ({group.member_count})
          </button>
        </div>

        {tab === "feed" && (
          <div className="mt-4">
            {canPost ? (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left text-zinc-500 transition hover:border-brand/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-text">
                  ✎
                </span>
                Share something with {group.name}
              </button>
            ) : isActiveMember ? (
              <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
                Only the owner and authorized posters can post in this
                community.
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
                {myMembership?.status === "pending"
                  ? "Your request to join is pending approval."
                  : "Join this community to post and see the full feed."}
              </div>
            )}

            {isActiveMember && posts.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-600">
                No posts yet — be the first to share something.
              </div>
            )}

            {isActiveMember && (
              <div className="space-y-4">
                {posts.map((p) => (
                  <DiscussionCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    preview={p.body}
                    authorName={p.authorName}
                    category={p.category}
                    replyCount={p.replyCount}
                    voteCount={p.voteCount}
                    createdAt={p.created_at}
                    mediaUrls={p.mediaUrls}
                    videoUrl={p.videoUrl}
                    youtubeUrl={p.youtubeUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "members" && (
          <div className="mt-4 space-y-6">
            {isOwner && pending.length > 0 && (
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
                      <span className="text-sm text-zinc-900">
                        {m.display_name || m.email || "Community Member"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approveRequest(m.id)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-brand-dark"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectRequest(m.id)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-red-400 hover:text-red-500"
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
              <h3 className="text-sm font-semibold text-zinc-900">
                Members ({members.length})
              </h3>
              <div className="mt-2 space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand-text">
                      {(m.display_name || m.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm text-zinc-900">
                      {m.display_name || m.email || "Community Member"}
                    </span>
                    {m.role !== "member" && (
                      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {m.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {composerOpen && (
        <PostComposer
          onClose={() => {
            setComposerOpen(false);
            loadEverything();
          }}
          isLoggedIn={Boolean(userId)}
          groupId={group.id}
          groupSlug={group.slug}
        />
      )}
    </main>
  );
}
