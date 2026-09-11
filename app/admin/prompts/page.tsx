"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type PromptItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  category: string;
  media_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_trending: boolean;
  category_name: string | null;
  category_id: string | null;
  created_at: string;
};

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<
    PromptItem[]
  >([]);
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState<
    "newest" | "oldest" | "title-az" | "title-za"
  >("newest");

  async function loadCategories() {
    const { data } = await supabase
      .from("prompt_categories")
      .select("id, name")
      .order("sort_order", { ascending: true });

    setCategories(data || []);
  }

  async function loadPrompts() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.rpc("search_prompts_admin", {
        search_query: searchInput.trim() || null,
        filter_category_id:
          categoryFilter !== "all" && categoryFilter !== "uncategorized"
            ? categoryFilter
            : null,
        sort_option: sortOption,
      });

      if (error) {
        throw error;
      }

      const rows = (data || []) as PromptItem[];

      setPrompts(
        categoryFilter === "uncategorized"
          ? rows.filter((r) => !r.category_id)
          : rows
      );
    } catch (err) {
      console.error(
        "Failed to load admin prompts:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load prompts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        loadPrompts();
      },
      searchInput ? 250 : 0
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, categoryFilter, sortOption]);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
              Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Prompt Library
            </h1>

            <p className="mt-2 text-zinc-600">
              Create, edit and manage AI prompts.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/prompts/taxonomy"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Taxonomy
            </Link>

            <Link
              href="/admin/prompts/bulk-import"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Import
            </Link>

            <Link
              href="/admin/prompts/bulk-metadata"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Metadata
            </Link>

            <Link
              href="/admin/prompts/bulk-images"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Images
            </Link>

            <Link
              href="/admin/prompts/deduplicate"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-300 px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Deduplicate
            </Link>

            <Link
              href="/admin/prompts/taxonomy-diagnostic"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Diagnostic
            </Link>

            <Link
              href="/admin/prompts/bulk-assign-taxonomy"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-brand/50"
            >
              Bulk Assign Taxonomy
            </Link>

            <Link
              href="/admin/prompts/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
            >
              + Create Prompt
            </Link>
          </div>
        </div>

        {/* ERROR */}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-900/50 bg-white p-6">
            <h2 className="font-semibold text-red-400">
              Unable to load prompts
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadPrompts}
              className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white"
                />
              )
            )}
          </div>
        )}

        {/* SEARCH + FILTER + SORT */}

        <div className="mt-6 flex flex-wrap gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search prompts..."
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-brand"
          >
            <option value="all">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(e) =>
              setSortOption(e.target.value as typeof sortOption)
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-brand"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title-az">Title A–Z</option>
            <option value="title-za">Title Z–A</option>
          </select>
        </div>

        {/* EMPTY */}

        {!loading &&
          !error &&
          prompts.length === 0 && (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-12 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">
                {searchInput.trim() || categoryFilter !== "all"
                  ? "No prompts match"
                  : "No prompts yet"}
              </h2>

              <p className="mt-2 text-sm text-zinc-600">
                {searchInput.trim() || categoryFilter !== "all"
                  ? "Try a different search or filter."
                  : "Create your first prompt."}
              </p>

              {!(searchInput.trim() || categoryFilter !== "all") && (
                <Link
                  href="/admin/prompts/new"
                  className="mt-5 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
                >
                  Create Prompt
                </Link>
              )}
            </div>
          )}

        {/* LIST */}

        {!loading &&
          !error &&
          prompts.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[1fr_120px_100px_150px] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 md:grid">
                <span>Prompt</span>
                <span>Category</span>
                <span>Type</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-zinc-800">
                {prompts.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-white/50 md:grid-cols-[1fr_120px_100px_150px] md:items-center"
                  >
                    <div className="flex min-w-0 gap-4">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                        {item.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              item.media_url
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                            No media
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-zinc-900">
                          {item.title}
                        </h2>

                        <p className="mt-1 truncate text-sm text-zinc-600">
                          /prompt/{item.slug}
                        </p>

                        <div className="mt-1 flex gap-2">
                          {item.is_featured && (
                            <span className="text-xs text-brand-text">
                              Featured
                            </span>
                          )}

                          {item.is_trending && (
                            <span className="text-xs text-brand-text">
                              Trending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-zinc-600">
                      {item.category_name || "Uncategorized"}
                    </div>

                    <div className="text-sm capitalize text-zinc-600">
                      {item.type || "—"}
                    </div>

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
                        href={`/admin/prompts/${item.id}`}
                        className="text-sm font-medium text-brand-text transition hover:text-brand-text"
                      >
                        Edit
                      </Link>
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
