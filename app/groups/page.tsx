"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import CommunitySwitcher from "@/components/community/CommunitySwitcher";

type GroupRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "invite_only";
  cover_image_url: string | null;
  member_count: number;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      const [groupsRes, myMembershipRes] = await Promise.all([
        supabaseAuthClient
          .from("groups")
          .select(
            "id, slug, name, description, category, visibility, cover_image_url, member_count"
          )
          .is("deleted_at", null)
          .order("member_count", { ascending: false }),
        user
          ? supabaseAuthClient
              .from("group_members")
              .select("group_id")
              .eq("user_id", user.id)
              .eq("status", "active")
          : Promise.resolve({ data: [] as { group_id: string }[] }),
      ]);

      if (groupsRes.error) {
        console.error(
          "GroupsPage: failed to load groups:",
          groupsRes.error.message
        );
      }

      setGroups((groupsRes.data || []) as GroupRow[]);
      setMyGroupIds(
        new Set((myMembershipRes.data || []).map((m) => m.group_id))
      );
      setLoading(false);
    }

    load();
  }, []);

  const myGroups = groups.filter((g) => myGroupIds.has(g.id));
  const otherGroups = groups.filter((g) => !myGroupIds.has(g.id));

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <CommunitySwitcher />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Communities</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Join a community built around a specific AI topic, tool, or
              creator — or start your own.
            </p>
          </div>

          <Link
            href="/groups/new"
            className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
          >
            + Start a Community
          </Link>
        </div>

        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50"
              />
            ))}
          </div>
        )}

        {!loading && myGroups.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-900">
              Your Communities
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myGroups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          </section>
        )}

        {!loading && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-900">
              Discover Communities
            </h2>

            {otherGroups.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-600">
                No communities yet — be the first to start one.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherGroups.map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function GroupCard({ group }: { group: GroupRow }) {
  return (
    <Link
      href={`/groups/${group.slug}`}
      className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-brand/50 hover:shadow-md"
    >
      {group.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.cover_image_url}
          alt=""
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-brand-light text-3xl">
          🤝
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            {group.name}
          </h3>
          {group.visibility === "invite_only" && (
            <span className="shrink-0 text-xs" title="Invite-only">
              🔒
            </span>
          )}
        </div>

        {group.description && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">
            {group.description}
          </p>
        )}

        <p className="mt-2 text-xs text-zinc-500">
          {group.member_count}{" "}
          {group.member_count === 1 ? "member" : "members"}
          {group.category && ` · ${group.category}`}
        </p>
      </div>
    </Link>
  );
}
