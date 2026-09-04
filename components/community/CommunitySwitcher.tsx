"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type MyGroup = {
  id: string;
  slug: string;
  name: string;
};

export default function CommunitySwitcher() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      setUserId(user?.id || null);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseAuthClient
        .from("group_members")
        .select("groups ( id, slug, name )")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error(
          "CommunitySwitcher: failed to load your communities:",
          error.message
        );
        setLoading(false);
        return;
      }

      const groups = (
        (data || []) as unknown as Array<{
          groups: { id: string; slug: string; name: string } | null;
        }>
      )
        .map((row) => row.groups)
        .filter((g): g is MyGroup => Boolean(g));

      setMyGroups(groups);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:border-brand/50"
      >
        🏠 My Feed
        <span className="text-xs text-zinc-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            🏠 My Feed
          </Link>

          <div className="border-t border-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            My Communities
          </div>

          {!userId && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Log in to join communities
            </Link>
          )}

          {userId && loading && (
            <div className="px-4 py-2.5 text-sm text-zinc-400">
              Loading...
            </div>
          )}

          {userId && !loading && myGroups.length === 0 && (
            <div className="px-4 py-2.5 text-sm text-zinc-500">
              You haven&apos;t joined any communities yet.
            </div>
          )}

          {userId &&
            myGroups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                onClick={() => setOpen(false)}
                className="block truncate px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                🤝 {g.name}
              </Link>
            ))}

          <Link
            href="/groups"
            onClick={() => setOpen(false)}
            className="block border-t border-zinc-100 px-4 py-3 text-sm font-medium text-brand-text hover:bg-zinc-50"
          >
            🔎 Explore Communities
          </Link>
        </div>
      )}
    </div>
  );
}
