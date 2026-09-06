"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import { pingIndexNow, buildLiveUrl } from "@/lib/seo/indexNow";

type Counts = {
  users: number;
  groups: number;
  threads: number;
  news: number;
  learningCards: number;
  libraryItems: number;
  pendingReports: number;
  pendingArtwork: number;
  pendingSubmissions: number;
  pendingGroupRequests: number;
};

type VisitorStats = {
  totalViews: number;
  viewsToday: number;
  uniqueVisitors30d: number;
  dailyViews: { label: string; count: number }[];
  topPages: { path: string; count: number }[];
  trafficSources: { source: string; count: number }[];
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

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

      const [
        usersRes,
        groupsRes,
        threadsRes,
        newsRes,
        learningCardsRes,
        libraryItemsRes,
        pendingReportsRes,
        pendingArtworkRes,
        pendingSubmissionsRes,
        pendingGroupRequestsRes,
      ] = await Promise.all([
        supabaseAuthClient
          .from("profiles")
          .select("id", { count: "exact", head: true }),
        supabaseAuthClient
          .from("groups")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAuthClient
          .from("community_threads")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAuthClient
          .from("news")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAuthClient
          .from("learning_cards")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAuthClient
          .from("library_items")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabaseAuthClient
          .from("content_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAuthClient
          .from("community_artwork")
          .select("id", { count: "exact", head: true })
          .in("status", ["submitted", "under_review"]),
        supabaseAuthClient
          .from("prompt_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabaseAuthClient
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      const results = [
        ["profiles", usersRes],
        ["groups", groupsRes],
        ["community_threads", threadsRes],
        ["news", newsRes],
        ["learning_cards", learningCardsRes],
        ["library_items", libraryItemsRes],
        ["content_reports", pendingReportsRes],
        ["community_artwork", pendingArtworkRes],
        ["prompt_submissions", pendingSubmissionsRes],
        ["group_members", pendingGroupRequestsRes],
      ] as const;

      for (const [table, res] of results) {
        if (res.error) {
          console.error(
            `AdminDashboard: failed to count ${table}:`,
            res.error.message
          );
        }
      }

      setCounts({
        users: usersRes.count || 0,
        groups: groupsRes.count || 0,
        threads: threadsRes.count || 0,
        news: newsRes.count || 0,
        learningCards: learningCardsRes.count || 0,
        libraryItems: libraryItemsRes.count || 0,
        pendingReports: pendingReportsRes.count || 0,
        pendingArtwork: pendingArtworkRes.count || 0,
        pendingSubmissions: pendingSubmissionsRes.count || 0,
        pendingGroupRequests: pendingGroupRequestsRes.count || 0,
      });
      setLoading(false);

      await loadVisitorStats();
    }

    async function loadVisitorStats() {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [totalRes, todayRes, last30dRes, last7dRes] = await Promise.all([
        supabaseAuthClient
          .from("page_views")
          .select("id", { count: "exact", head: true }),
        supabaseAuthClient
          .from("page_views")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfToday.toISOString()),
        supabaseAuthClient
          .from("page_views")
          .select("visitor_id, path, referrer_host")
          .gte("created_at", start30d.toISOString()),
        supabaseAuthClient
          .from("page_views")
          .select("created_at")
          .gte("created_at", start7d.toISOString()),
      ]);

      if (totalRes.error) {
        console.error(
          "AdminDashboard: failed to load page_views:",
          totalRes.error.message
        );
      }

      const uniqueVisitors30d = new Set(
        (last30dRes.data || []).map((r) => r.visitor_id)
      ).size;

      const pageCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};

      for (const row of last30dRes.data || []) {
        pageCounts[row.path] = (pageCounts[row.path] || 0) + 1;

        const source = row.referrer_host || "Direct / Unknown";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }

      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

      const trafficSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => ({ source, count }));

      const dailyBuckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        dailyBuckets[key] = 0;
      }

      for (const row of last7dRes.data || []) {
        const key = row.created_at.slice(0, 10);
        if (key in dailyBuckets) {
          dailyBuckets[key] += 1;
        }
      }

      setVisitorStats({
        totalViews: totalRes.count || 0,
        viewsToday: todayRes.count || 0,
        uniqueVisitors30d,
        dailyViews: Object.entries(dailyBuckets).map(([date, cnt]) => ({
          label: new Date(date).toLocaleDateString(undefined, {
            weekday: "short",
          }),
          count: cnt,
        })),
        topPages,
        trafficSources,
      });
    }

    init();
  }, [router]);

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
  }

  async function runIndexNowBackfill() {
    setBackfillRunning(true);
    setBackfillResult(null);

    try {
      const [newsRes, learningRes, promptsRes] = await Promise.all([
        supabaseAuthClient
          .from("news")
          .select("slug")
          .eq("is_published", true),
        supabaseAuthClient
          .from("learning_cards")
          .select("slug")
          .eq("is_published", true),
        supabaseAuthClient
          .from("library_items")
          .select("slug")
          .eq("is_published", true),
      ]);

      const urls = [
        ...(newsRes.data || []).map((r) => buildLiveUrl(`/news/${r.slug}`)),
        ...(learningRes.data || []).map((r) =>
          buildLiveUrl(`/learning/${r.slug}`)
        ),
        ...(promptsRes.data || []).map((r) =>
          buildLiveUrl(`/prompt/${r.slug}`)
        ),
      ];

      if (urls.length === 0) {
        setBackfillResult("No published content found to submit.");
        return;
      }

      /*
       * IndexNow supports up to 10,000 URLs per submission — one
       * bulk call covers everything already published, rather
       * than looping and pinging one at a time.
       */
      const result = await pingIndexNow(urls);

      setBackfillResult(
        result.ok
          ? `✓ Submitted ${urls.length} already-published URLs to Bing, Yandex, and others.`
          : `⚠ Submission failed: ${result.message}`
      );
    } catch (err) {
      setBackfillResult(
        err instanceof Error
          ? `⚠ Backfill failed: ${err.message}`
          : "⚠ Backfill failed for an unknown reason."
      );
    } finally {
      setBackfillRunning(false);
    }
  }

  const totalPending = counts
    ? counts.pendingReports +
      counts.pendingArtwork +
      counts.pendingSubmissions +
      counts.pendingGroupRequests
    : 0;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Platform overview and quick actions.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-neutral-500">Loading counts...</p>
      )}

      {!loading && counts && (
        <>
          {totalPending > 0 && (
            <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="text-sm font-semibold text-yellow-400">
                {totalPending} item{totalPending === 1 ? "" : "s"} need
                {totalPending === 1 ? "s" : ""} your attention
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {counts.pendingReports > 0 && (
                  <QuickLink
                    href="/admin/reports"
                    label={`${counts.pendingReports} report${
                      counts.pendingReports === 1 ? "" : "s"
                    }`}
                  />
                )}
                {counts.pendingArtwork > 0 && (
                  <QuickLink
                    href="/admin/artwork"
                    label={`${counts.pendingArtwork} artwork submission${
                      counts.pendingArtwork === 1 ? "" : "s"
                    }`}
                  />
                )}
                {counts.pendingSubmissions > 0 && (
                  <QuickLink
                    href="/admin/submissions"
                    label={`${counts.pendingSubmissions} prompt submission${
                      counts.pendingSubmissions === 1 ? "" : "s"
                    }`}
                  />
                )}
                {counts.pendingGroupRequests > 0 && (
                  <QuickLink
                    href="/groups"
                    label={`${counts.pendingGroupRequests} community join request${
                      counts.pendingGroupRequests === 1 ? "" : "s"
                    } (check each owner's Manage panel)`}
                  />
                )}
              </div>
            </div>
          )}

          <h2 className="mt-8 text-sm font-semibold text-neutral-300">
            Visitors
          </h2>
          {visitorStats ? (
            <>
              <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Total Page Views" value={visitorStats.totalViews} />
                <StatCard label="Views Today" value={visitorStats.viewsToday} />
                <StatCard
                  label="Unique Visitors (30d)"
                  value={visitorStats.uniqueVisitors30d}
                />
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-neutral-900 p-4">
                <p className="mb-3 text-xs text-neutral-500">
                  Page views, last 7 days
                </p>
                <div className="flex h-24 items-end gap-2">
                  {visitorStats.dailyViews.map((d, i) => {
                    const max = Math.max(
                      1,
                      ...visitorStats.dailyViews.map((x) => x.count)
                    );
                    const heightPct = (d.count / max) * 100;
                    return (
                      <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div className="flex h-16 w-full items-end">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full rounded-t bg-brand"
                            title={`${d.count} views`}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
                  <p className="mb-3 text-xs text-neutral-500">
                    Top pages (last 30 days)
                  </p>
                  {visitorStats.topPages.length === 0 ? (
                    <p className="text-xs text-neutral-600">No data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {visitorStats.topPages.map((p) => (
                        <div
                          key={p.path}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate text-neutral-300">
                            {p.path}
                          </span>
                          <span className="shrink-0 font-semibold text-white">
                            {p.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
                  <p className="mb-3 text-xs text-neutral-500">
                    Traffic sources (last 30 days)
                  </p>
                  {visitorStats.trafficSources.length === 0 ? (
                    <p className="text-xs text-neutral-600">No data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {visitorStats.trafficSources.map((s) => (
                        <div
                          key={s.source}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate text-neutral-300">
                            {s.source}
                          </span>
                          <span className="shrink-0 font-semibold text-white">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              Loading visitor stats...
            </p>
          )}

          <h2 className="mt-8 text-sm font-semibold text-neutral-300">
            Content Totals
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Users" value={counts.users} href="/admin/users" />
            <StatCard label="Communities" value={counts.groups} href="/groups" />
            <StatCard label="Community Posts" value={counts.threads} />
            <StatCard label="News Articles" value={counts.news} href="/admin/news" />
            <StatCard
              label="Learning Cards"
              value={counts.learningCards}
              href="/admin/learning-cards"
            />
            <StatCard
              label="Library Prompts"
              value={counts.libraryItems}
              href="/admin/prompts"
            />
          </div>

          <h2 className="mt-8 text-sm font-semibold text-neutral-300">
            Quick Actions
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ActionLink href="/admin/news/new" label="+ New Article" />
            <ActionLink href="/admin/learning-cards/new" label="+ New Learning Card" />
            <ActionLink href="/admin/prompts/new" label="+ New Prompt" />
            <ActionLink href="/admin/users" label="Manage Users" />
            <ActionLink href="/admin/reports" label="Review Reports" />
            <ActionLink href="/admin/artwork" label="Review Artwork" />
            <ActionLink href="/admin/submissions" label="Review Submissions" />
            <ActionLink href="/admin/audit-log" label="Audit Log" />
          </div>

          <h2 className="mt-8 text-sm font-semibold text-neutral-300">
            Search Engine Indexing
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            New publishes now automatically notify Bing/Yandex/others. This
            is a one-time catch-up for everything published before that
            automation existed.
          </p>
          <button
            type="button"
            onClick={runIndexNowBackfill}
            disabled={backfillRunning}
            className="mt-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-white hover:border-brand/50 disabled:opacity-50"
          >
            {backfillRunning
              ? "Submitting..."
              : "Submit all already-published content to IndexNow"}
          </button>
          {backfillResult && (
            <p className="mt-2 text-xs text-neutral-400">{backfillResult}</p>
          )}

          <p className="mt-8 text-xs text-neutral-600">
            Visitor counts are first-party (tracked directly into your own
            database, not a third-party service like Plausible/GA). Unique
            visitors are counted by an anonymous ID stored in the browser —
            same limitation every analytics tool has, since one person using
            two browsers/devices counts as two visitors.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 transition hover:border-brand/50">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-neutral-300 transition hover:border-brand/50 hover:text-white"
    >
      {label}
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-yellow-500/40 px-3 py-1 text-yellow-300 hover:bg-yellow-500/10"
    >
      {label}
    </Link>
  );
}
