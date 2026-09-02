"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ReportRow = {
  id: string;
  content_type:
    | "community_thread"
    | "community_reply"
    | "community_poll";
  content_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
};

const CONTENT_TYPE_TABLE: Record<
  string,
  string
> = {
  community_thread: "community_threads",
  community_reply: "community_replies",
  community_poll: "community_polls",
};

const CONTENT_TYPE_LABEL: Record<
  string,
  string
> = {
  community_thread: "Post",
  community_reply: "Reply",
  community_poll: "Poll",
};

export default function AdminReportsPage() {
  const router = useRouter();

  const [checking, setChecking] =
    useState(true);
  const [reports, setReports] = useState<
    ReportRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [filter, setFilter] = useState<
    "pending" | "all"
  >("pending");

  async function loadReports() {
    setLoading(true);

    let query = supabaseAuthClient
      .from("content_reports")
      .select(
        `
          id, content_type, content_id,
          reason, details, status,
          created_at,
          profiles ( display_name, email )
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (filter === "pending") {
      query = query.eq(
        "status",
        "pending"
      );
    }

    const { data } = await query;

    setReports(
      (data || []) as unknown as ReportRow[]
    );
    setLoading(false);
  }

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } =
        await supabaseAuthClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setChecking(false);
      await loadReports();
    }

    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, filter]);

  async function handleHide(
    report: ReportRow
  ) {
    const table =
      CONTENT_TYPE_TABLE[
        report.content_type
      ];

    await supabaseAuthClient
      .from(table)
      .update({ is_hidden: true })
      .eq("id", report.content_id);

    await supabaseAuthClient
      .from("content_reports")
      .update({ status: "reviewed" })
      .eq("id", report.id);

    await loadReports();
  }

  async function handleDelete(
    report: ReportRow
  ) {
    const confirmed = window.confirm(
      "Permanently delete this content?"
    );

    if (!confirmed) {
      return;
    }

    const table =
      CONTENT_TYPE_TABLE[
        report.content_type
      ];

    await supabaseAuthClient
      .from(table)
      .delete()
      .eq("id", report.content_id);

    await supabaseAuthClient
      .from("content_reports")
      .update({ status: "reviewed" })
      .eq("id", report.id);

    await loadReports();
  }

  async function handleDismiss(
    report: ReportRow
  ) {
    await supabaseAuthClient
      .from("content_reports")
      .update({ status: "dismissed" })
      .eq("id", report.id);

    await loadReports();
  }

  function contentLink(
    report: ReportRow
  ): string {
    if (
      report.content_type ===
      "community_poll"
    ) {
      return `/community/polls/${report.content_id}`;
    }

    // Both threads and replies live
    // under the thread detail page —
    // for replies we don't have the
    // parent thread id here, so link
    // to discussions listing instead
    // as a safe fallback.

    if (
      report.content_type ===
      "community_thread"
    ) {
      return `/discussions/${report.content_id}`;
    }

    return "/discussions";
  }

  if (checking) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">
          Content Reports
        </h1>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() =>
              setFilter("pending")
            }
            className={`rounded-full border px-4 py-1.5 text-sm ${
              filter === "pending"
                ? "border-brand bg-brand text-zinc-900"
                : "border-zinc-300 text-zinc-400"
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() =>
              setFilter("all")
            }
            className={`rounded-full border px-4 py-1.5 text-sm ${
              filter === "all"
                ? "border-brand bg-brand text-zinc-900"
                : "border-zinc-300 text-zinc-400"
            }`}
          >
            All
          </button>
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-white"
              />
            ))}
          </div>
        )}

        {!loading &&
          reports.length === 0 && (
            <p className="mt-6 text-sm text-zinc-400">
              No{" "}
              {filter === "pending"
                ? "pending "
                : ""}
              reports.
            </p>
          )}

        {!loading &&
          reports.length > 0 && (
            <div className="mt-6 space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-400">
                      {
                        CONTENT_TYPE_LABEL[
                          report
                            .content_type
                        ]
                      }
                    </span>

                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-400">
                      {report.reason}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        report.status ===
                        "pending"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : report.status ===
                              "reviewed"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {report.details && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {report.details}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-zinc-400">
                    Reported by{" "}
                    {report.profiles
                      ?.display_name ||
                      report.profiles
                        ?.email ||
                      "Unknown"}{" "}
                    ·{" "}
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={contentLink(
                        report
                      )}
                      target="_blank"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 hover:bg-zinc-100"
                    >
                      View Content
                    </Link>

                    {report.status ===
                      "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleHide(
                              report
                            )
                          }
                          className="rounded-lg border border-yellow-700/50 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10"
                        >
                          Hide
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              report
                            )
                          }
                          className="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDismiss(
                              report
                            )
                          }
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-100"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
