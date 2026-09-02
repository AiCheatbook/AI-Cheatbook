"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  sourceLabel: string;
  icon: string;
};

const SOURCE_ICON: Record<string, string> = {
  "AI Library": "✦",
  "AI News": "📰",
  Learning: "💡",
  Community: "💬",
  Discussion: "💬",
  Poll: "📊",
};

export default function HeroSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    SearchResult[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const searchRef =
    useRef<HTMLDivElement>(null);

  /*
   * Global search — real functionality
   * across every publicly searchable
   * content type on the site, not just
   * the Prompt Library. Each source is
   * queried in parallel and results are
   * merged, each clearly labeled by
   * where it came from.
   */
  useEffect(() => {
    const trimmedQuery = query.trim();

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (!trimmedQuery) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const term = `%${trimmedQuery}%`;

        const [
          libraryResponse,
          newsResponse,
          learningResponse,
          threadsResponse,
          pollsResponse,
        ] = await Promise.all([
          supabase
            .from("library_items")
            .select(
              "id, slug, title, type, category, description"
            )
            .or(
              [
                `title.ilike.${term}`,
                `description.ilike.${term}`,
                `prompt.ilike.${term}`,
              ].join(",")
            )
            .eq("is_published", true)
            .limit(4),
          supabase
            .from("news")
            .select("id, slug, title")
            .ilike("title", term)
            .eq("is_published", true)
            .limit(3),
          supabase
            .from("learning_cards")
            .select(
              "id, slug, title, summary"
            )
            .or(
              [
                `title.ilike.${term}`,
                `summary.ilike.${term}`,
              ].join(",")
            )
            .eq("is_published", true)
            .limit(3),
          supabase
            .from("community_threads")
            .select(
              "id, title, body, content_kind"
            )
            .or(
              [
                `title.ilike.${term}`,
                `body.ilike.${term}`,
              ].join(",")
            )
            .eq("is_hidden", false)
            .limit(4),
          supabase
            .from("community_polls")
            .select("id, question")
            .ilike("question", term)
            .limit(2),
        ]);

        if (cancelled) {
          return;
        }

        const merged: SearchResult[] = [];

        for (const item of libraryResponse.data ||
          []) {
          merged.push({
            id: `library-${item.id}`,
            title: item.title,
            description:
              item.description,
            href: `/prompt/${item.slug}`,
            sourceLabel: "AI Library",
            icon: SOURCE_ICON[
              "AI Library"
            ],
          });
        }

        for (const item of newsResponse.data ||
          []) {
          merged.push({
            id: `news-${item.id}`,
            title: item.title,
            description: null,
            href: `/news/${item.slug}`,
            sourceLabel: "AI News",
            icon: SOURCE_ICON["AI News"],
          });
        }

        for (const item of learningResponse.data ||
          []) {
          merged.push({
            id: `learning-${item.id}`,
            title: item.title,
            description:
              item.summary,
            href: `/learning/${item.slug}`,
            sourceLabel: "Learning",
            icon: SOURCE_ICON["Learning"],
          });
        }

        for (const item of threadsResponse.data ||
          []) {
          const label =
            item.content_kind ===
            "question"
              ? "Discussion"
              : "Community";

          merged.push({
            id: `thread-${item.id}`,
            title: item.title,
            description: item.body,
            href: `/discussions/${item.id}`,
            sourceLabel: label,
            icon: SOURCE_ICON[label],
          });
        }

        for (const item of pollsResponse.data ||
          []) {
          merged.push({
            id: `poll-${item.id}`,
            title: item.question,
            description: null,
            href: `/community/polls/${item.id}`,
            sourceLabel: "Poll",
            icon: SOURCE_ICON["Poll"],
          });
        }

        setResults(merged.slice(0, 10));
        setShowSuggestions(true);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Global search error:",
            error
          );

          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target as Node
        )
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    setShowSuggestions(false);

    if (!trimmedQuery) {
      router.push("/search");
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(
        trimmedQuery
      )}`
    );
  }

  function handleSuggestionClick(
    item: SearchResult
  ) {
    setShowSuggestions(false);
    setQuery(item.title);
    router.push(item.href);
  }

  function handleViewAll() {
    const trimmedQuery = query.trim();

    setShowSuggestions(false);

    if (!trimmedQuery) {
      router.push("/search");
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(
        trimmedQuery
      )}`
    );
  }

  const shouldShowDropdown =
    showSuggestions &&
    query.trim().length > 0;

  return (
    <div
      ref={searchRef}
      className="relative w-full"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full"
      >
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-zinc-500"
            >
              🔍
            </span>

            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (query.trim()) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Search AI Cheatbook..."
              aria-label="Search AI Cheatbook"
              aria-autocomplete="list"
              className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-12 pr-5 text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
            />

            {loading && (
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-500" />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="h-14 rounded-xl bg-orange-500 px-7 font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Search
          </button>
        </div>
      </form>

      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-50 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
          {loading && results.length === 0 && (
            <div className="px-5 py-6 text-sm text-zinc-500">
              Searching AI Cheatbook...
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              <div className="max-h-96 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleSuggestionClick(
                        item
                      )
                    }
                    className="flex w-full items-start gap-4 border-b border-zinc-800/70 px-5 py-4 text-left transition last:border-b-0 hover:bg-zinc-900"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-sm">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-white">
                          {item.title}
                        </p>
                      </div>

                      <span className="mt-0.5 inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-orange-400">
                        {item.sourceLabel}
                      </span>

                      {item.description && (
                        <p className="mt-1.5 line-clamp-1 text-xs text-zinc-500">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <span className="mt-1 text-zinc-600">
                      →
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleViewAll}
                className="w-full border-t border-zinc-800 bg-zinc-900/50 px-5 py-3.5 text-center text-sm font-medium text-orange-500 transition hover:bg-zinc-900 hover:text-orange-400"
              >
                View all results →
              </button>
            </div>
          )}

          {!loading &&
            results.length === 0 && (
              <div className="px-5 py-7 text-center">
                <div className="text-2xl">
                  🔎
                </div>

                <p className="mt-2 text-sm font-medium text-white">
                  No results found
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Try a different search
                  term.
                </p>

                <button
                  type="button"
                  onClick={handleViewAll}
                  className="mt-4 text-sm font-medium text-orange-500 hover:text-orange-400"
                >
                  Search the full library →
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
