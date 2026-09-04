"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

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

export default function AdminDashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);

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
    }

    init();
  }, [router]);

  if (checking) {
    return (
      <div className="p-8 text-sm text-neutral-400">Checking access...</div>
    );
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

          <p className="mt-8 text-xs text-neutral-600">
            Note: this dashboard shows real content and moderation counts
            from the database. It does not include visitor/traffic
            analytics (page views, unique visitors, etc.) — that would
            require a separate analytics integration (e.g. Plausible or
            Google Analytics), which isn&apos;t wired into this codebase
            today.
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
