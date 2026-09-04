"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type LogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actorName: string;
};

const PAGE_SIZE = 50;

export default function AdminAuditLogPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function loadLogs(pageNum: number) {
    setLoading(true);

    const { data, error } = await supabaseAuthClient
      .from("audit_log")
      .select(
        "id, actor_id, action, target_type, target_id, details, created_at, profiles(display_name, email)"
      )
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1);

    if (error) {
      console.error("AdminAuditLogPage: failed to load logs:", error.message);
      setLoading(false);
      return;
    }

    const rows = (
      (data || []) as unknown as Array<{
        id: string;
        actor_id: string | null;
        action: string;
        target_type: string | null;
        target_id: string | null;
        details: Record<string, unknown> | null;
        created_at: string;
        profiles: { display_name: string | null; email: string | null } | null;
      }>
    ).map((r) => ({
      id: r.id,
      actor_id: r.actor_id,
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      details: r.details,
      created_at: r.created_at,
      actorName: r.profiles?.display_name || r.profiles?.email || "System",
    }));

    setHasMore(rows.length === PAGE_SIZE);
    setLogs((prev) => (pageNum === 0 ? rows : [...prev, ...rows]));
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
      await loadLogs(0);
    }

    init();
  }, [router]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    loadLogs(next);
  }

  const actionTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const targetTypes = useMemo(
    () =>
      Array.from(
        new Set(logs.map((l) => l.target_type).filter(Boolean) as string[])
      ).sort(),
    [logs]
  );

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (targetTypeFilter !== "all" && l.target_type !== targetTypeFilter)
      return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      l.actorName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.target_id || "").toLowerCase().includes(q)
    );
  });

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white">Audit Log</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Every logged admin and community-owner action, most recent first.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">All actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">All target types</option>
          {targetTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actor, action, or target ID..."
          className="w-64 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-brand"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No matching log entries.
                </td>
              </tr>
            )}

            {filtered.map((l) => (
              <Fragment key={l.id}>
                <tr className="border-t border-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white">{l.actorName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-text">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {l.target_type || "—"}
                    {l.target_id && (
                      <span className="ml-1 text-xs text-neutral-600">
                        ({l.target_id.slice(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.details && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expandedId === l.id ? null : l.id)
                        }
                        className="text-xs text-neutral-400 hover:text-white"
                      >
                        {expandedId === l.id ? "Hide" : "Details"}
                      </button>
                    )}
                  </td>
                </tr>

                {expandedId === l.id && l.details && (
                  <tr className="border-t border-white/5 bg-neutral-950">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="overflow-x-auto text-xs text-neutral-400">
                        {JSON.stringify(l.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 hover:border-brand/50"
        >
          Load more
        </button>
      )}

      {loading && logs.length > 0 && (
        <p className="mt-4 text-sm text-neutral-500">Loading more...</p>
      )}
    </div>
  );
}
