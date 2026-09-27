"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  GraduationCap,
  Newspaper,
  Plus,
  Search,
  X,
} from "lucide-react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";
import {
  TOP_TEN_ID,
  TOP_TEN_MAX,
  parseTopTen,
  resolveTopTen,
  type TopTenEntry,
  type TopTenType,
} from "@/lib/topTen";

/*
 * Pick and order the homepage "Top 10" from existing published
 * news and Learning Cards. Saved as the "top_ten" row of the
 * site_settings table.
 */

type SearchResult = TopTenEntry;

type Filter = "all" | TopTenType;

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /could not find the table|relation .* does not exist/i.test(
          error.message || ""
        ))
  );
}

export default function TopTenAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<TopTenEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("site_settings")
        .select("settings")
        .eq("id", TOP_TEN_ID)
        .maybeSingle();

      if (cancelled) return;

      if (isMissingTableError(loadError)) {
        setMissingTable(true);
      } else if (loadError) {
        setError(loadError.message);
      } else {
        const entries = await resolveTopTen(
          parseTopTen(data?.settings),
          supabase
        );
        if (!cancelled) setItems(entries);
      }

      setChecking(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Search published news and Learning Cards by title (newest first
  // when the box is empty).
  useEffect(() => {
    if (checking) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);

      const term = query.trim();
      const build = (table: "news" | "learning_cards") => {
        let q = supabase
          .from(table)
          .select(
            "id, title, slug, category, cover_image_url, thumbnail_url, media_source"
          )
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("published_at", { ascending: false })
          .limit(12);
        if (term) q = q.ilike("title", `%${term}%`);
        return q;
      };

      const [newsRes, lessonRes] = await Promise.all([
        filter === "learning_card" ? Promise.resolve({ data: [] }) : build("news"),
        filter === "news" ? Promise.resolve({ data: [] }) : build("learning_cards"),
      ]);

      if (cancelled) return;

      type Row = {
        id: string;
        title: string;
        slug: string;
        category: string | null;
        cover_image_url: string | null;
        thumbnail_url: string | null;
        media_source: string | null;
      };

      const toResult = (type: TopTenType, row: Row): SearchResult => ({
        type,
        id: row.id,
        title: row.title,
        category: row.category,
        imageUrl:
          resolveThumbnailUrl(
            row.thumbnail_url,
            row.cover_image_url,
            row.media_source
          ) || null,
        href: type === "news" ? `/news/${row.slug}` : `/learning/${row.slug}`,
      });

      setResults([
        ...((lessonRes.data || []) as Row[]).map((r) =>
          toResult("learning_card", r)
        ),
        ...((newsRes.data || []) as Row[]).map((r) => toResult("news", r)),
      ]);
      setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, filter, checking]);

  const isPicked = (r: { type: TopTenType; id: string }) =>
    items.some((i) => i.type === r.type && i.id === r.id);

  function add(result: SearchResult) {
    if (items.length >= TOP_TEN_MAX || isPicked(result)) return;
    setItems((prev) => [...prev, result]);
    setNotice("");
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setNotice("");
  }

  function move(index: number, delta: 1 | -1) {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setNotice("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { error: saveError } = await supabase.from("site_settings").upsert({
        id: TOP_TEN_ID,
        settings: { items: items.map(({ type, id }) => ({ type, id })) },
        updated_at: new Date().toISOString(),
      });

      if (isMissingTableError(saveError)) {
        setMissingTable(true);
        throw new Error("Run the one-time Site Settings database update first.");
      }
      if (saveError) throw new Error(saveError.message);

      const refresh = await fetch("/api/site-settings/refresh", {
        method: "POST",
      });

      setNotice(
        refresh.ok
          ? "Saved. The homepage Top 10 is updated."
          : "Saved. The homepage will show it within 5 minutes."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-2xl bg-zinc-200" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-28 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Homepage Top 10</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pick up to 10 Learning Cards and news stories to show at the top of
          the homepage, in your order. If the list is empty, the newest
          lessons and news are shown instead.
        </p>

        {missingTable && (
          <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">One-time database update needed</p>
            <p className="mt-1">
              Run{" "}
              <code className="rounded bg-amber-100 px-1">
                database/061_site_settings.sql
              </code>{" "}
              in the Supabase SQL Editor, then reload this page.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Picked list */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-bold">Your Top 10</h2>
              <span className="text-xs font-semibold text-zinc-500">
                {items.length} / {TOP_TEN_MAX}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                Nothing picked yet. Add items from the right.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {items.map((item, index) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2"
                  >
                    <span
                      className="w-8 shrink-0 text-center text-2xl font-black text-white"
                      style={{ WebkitTextStroke: "1.5px #0077A3" }}
                    >
                      {index + 1}
                    </span>
                    <span className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        {item.type === "news" ? (
                          <Newspaper className="h-3 w-3" />
                        ) : (
                          <GraduationCap className="h-3 w-3" />
                        )}
                        {item.type === "news" ? "News" : "Learning Card"}
                        {item.category ? ` · ${item.category}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => remove(index)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Search */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold">Add from your content</h2>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title…"
                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <div className="mt-3 flex gap-2">
              {(
                [
                  ["all", "All"],
                  ["learning_card", "Learning Cards"],
                  ["news", "News"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    filter === value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ul className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
              {searching && results.length === 0 && (
                <li className="p-2 text-sm text-zinc-400">Searching…</li>
              )}
              {!searching && results.length === 0 && (
                <li className="p-2 text-sm text-zinc-500">No matches.</li>
              )}
              {results.map((result) => {
                const picked = isPicked(result);
                const full = items.length >= TOP_TEN_MAX;
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      disabled={picked || full}
                      onClick={() => add(result)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="h-10 w-8 shrink-0 overflow-hidden rounded bg-zinc-100">
                        {result.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={result.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {result.title}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {result.type === "news" ? "News" : "Learning Card"}
                          {result.category ? ` · ${result.category}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-brand-text">
                        {picked ? "Added" : full ? "Full" : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : notice ? (
              <p className="text-green-600">{notice}</p>
            ) : (
              <p className="text-zinc-500">
                {items.length === 0
                  ? "Empty list: the homepage shows the newest items."
                  : `${items.length} picked`}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={saving || missingTable}
            onClick={save}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Top 10"}
          </button>
        </div>
      </div>
    </main>
  );
}
