"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  author: string | null;
  published_at: string | null;
  scheduled_publish_at: string | null;
  is_published: boolean;
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      try {
        const { data, error } = await supabase
          .from("news")
          .select(`
            id,
            slug,
            title,
            excerpt,
            cover_image_url,
            category,
            author,
            published_at,
            scheduled_publish_at,
            is_published
          `)
          .order("published_at", {
            ascending: false,
            nullsFirst: false,
          });

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        setNews((data || []) as NewsItem[]);
        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load admin news:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load news."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadNews() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("news")
        .select(`
          id,
          slug,
          title,
          excerpt,
          cover_image_url,
          category,
          author,
          published_at,
          scheduled_publish_at,
          is_published
        `)
        .order("published_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        throw error;
      }

      setNews((data || []) as NewsItem[]);
    } catch (err) {
      console.error(
        "Failed to reload admin news:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load news."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateSchedule(id: string, value: string) {
    const scheduledAt = value ? new Date(value).toISOString() : null;

    setNews((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, scheduled_publish_at: scheduledAt }
          : item
      )
    );

    const { error } = await supabase
      .from("news")
      .update({ scheduled_publish_at: scheduledAt })
      .eq("id", id);

    if (error) {
      console.error("Failed to update schedule:", error.message);
      alert(`Couldn't save the schedule: ${error.message}`);
      reloadNews();
    }
  }

  function toLocalInputValue(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 16);
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Not published";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl">

        {/* =========================
            HEADER
        ========================= */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
              Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              News
            </h1>

            <p className="mt-2 text-zinc-600">
              Create, edit and manage AI news.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/news/bulk-import"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Import
            </Link>

            <Link
              href="/admin/news/bulk-metadata"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Metadata
            </Link>

            <Link
              href="/admin/news/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
            >
              + Create News
            </Link>
          </div>

        </div>

        {/* =========================
            ERROR
        ========================= */}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-900/50 bg-white p-6">

            <h2 className="font-semibold text-red-400">
              Unable to load news
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
              {error}
            </p>

            <button
              type="button"
              onClick={reloadNews}
              className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100"
            >
              Try Again
            </button>

          </div>
        )}

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div className="mt-8 space-y-3">

            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white"
              />
            ))}

          </div>
        )}

        {/* =========================
            EMPTY STATE
        ========================= */}

        {!loading &&
          !error &&
          news.length === 0 && (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-12 text-center">

              <h2 className="text-lg font-semibold text-zinc-900">
                No news yet
              </h2>

              <p className="mt-2 text-sm text-zinc-600">
                Create your first AI news article.
              </p>

              <Link
                href="/admin/news/new"
                className="mt-5 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
              >
                Create News
              </Link>

            </div>
          )}

        {/* =========================
            NEWS LIST
        ========================= */}

        {!loading &&
          !error &&
          news.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

              {/* Table Header */}

              <div className="hidden grid-cols-[1fr_140px_150px_220px] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 md:grid">

                <span>News</span>

                <span>Category</span>

                <span>Published</span>

                <span>Status</span>

              </div>

              {/* Rows */}

              <div className="divide-y divide-zinc-800">

                {news.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-white/50 md:grid-cols-[1fr_140px_150px_220px] md:items-center"
                  >

                    {/* News */}

                    <div className="flex min-w-0 gap-4">

                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">

                        {item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                            No image
                          </div>
                        )}

                      </div>

                      <div className="min-w-0">

                        <h2 className="truncate font-semibold text-zinc-900">
                          {item.title}
                        </h2>

                        <p className="mt-1 truncate text-sm text-zinc-600">
                          /news/{item.slug}
                        </p>

                        {item.author && (
                          <p className="mt-1 text-xs text-zinc-600">
                            By {item.author}
                          </p>
                        )}

                      </div>

                    </div>

                    {/* Category */}

                    <div className="text-sm text-zinc-600">
                      {item.category || "—"}
                    </div>

                    {/* Date */}

                    <div className="text-sm text-zinc-600">
                      {formatDate(
                        item.published_at
                      )}
                    </div>

                    {/* Status */}

                    <div className="flex flex-col gap-2">

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.is_published
                              ? "bg-green-500/10 text-green-600"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {item.is_published
                            ? "Published"
                            : "Draft"}
                        </span>

                        <Link
                          href={`/admin/news/${item.id}`}
                          className="text-sm font-medium text-brand-text transition hover:text-brand-text"
                        >
                          Edit
                        </Link>
                      </div>

                      {!item.is_published && (
                        <input
                          type="datetime-local"
                          value={toLocalInputValue(
                            item.scheduled_publish_at
                          )}
                          onChange={(e) =>
                            updateSchedule(item.id, e.target.value)
                          }
                          title="Schedule this article to publish automatically at this time"
                          className="w-fit rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 outline-none focus:border-brand"
                        />
                      )}

                    </div>

                  </div>
                ))}

              </div>

            </div>
          )}

      </div>
    </main>
  );
}