"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  type: string | null;
  category: string | null;
  description: string | null;
};

export default function HeroSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const searchRef =
    useRef<HTMLDivElement>(null);

  /*
   * Search Supabase Library
   */
  useEffect(() => {
    const trimmedQuery = query.trim();

    let cancelled = false;

    /*
     * Use the same debounce flow for both
     * empty and non-empty queries.
     *
     * This avoids calling setState directly
     * inside the effect body.
     */
    const timer = window.setTimeout(async () => {
      if (!trimmedQuery) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const searchTerm = `%${trimmedQuery}%`;

        const { data, error } = await supabase
          .from("library_items")
          .select(
            `
              id,
              slug,
              title,
              type,
              category,
              description
            `
          )
          .or(
            [
              `title.ilike.${searchTerm}`,
              `slug.ilike.${searchTerm}`,
              `description.ilike.${searchTerm}`,
              `prompt.ilike.${searchTerm}`,
              `category.ilike.${searchTerm}`,
              `type.ilike.${searchTerm}`,
            ].join(",")
          )
          .order("sort_order", {
            ascending: true,
          })
          .limit(6);

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Hero search failed:",
            error
          );

          setResults([]);
          return;
        }

        setResults(
          Array.isArray(data)
            ? (data as LibraryItem[])
            : []
        );

        setShowSuggestions(true);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Hero search error:",
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

  /*
   * Close suggestions when clicking outside
   */
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

  /*
   * Submit search
   */
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

  /*
   * Open selected library result
   */
  function handleSuggestionClick(
    item: LibraryItem
  ) {
    setShowSuggestions(false);
    setQuery(item.title);

    router.push(
      `/prompt/${encodeURIComponent(item.slug)}`
    );
  }

  /*
   * Open complete library search
   */
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
          {/* Search Input */}

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
              placeholder="Search prompts, concepts, keywords..."
              aria-label="Search prompts, concepts and keywords"
              aria-autocomplete="list"
              className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-12 pr-5 text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
            />

            {/* Loading */}

            {loading && (
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-500" />
              </div>
            )}
          </div>

          {/* Search Button */}

          <button
            type="submit"
            className="h-14 rounded-xl bg-orange-500 px-7 font-semibold text-white transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Search
          </button>
        </div>
      </form>

      {/* Dynamic Suggestions */}

      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-50 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
          {/* Loading State */}

          {loading && results.length === 0 && (
            <div className="px-5 py-6 text-sm text-zinc-500">
              Searching the AI Cheatbook Library...
            </div>
          )}

          {/* Results */}

          {!loading && results.length > 0 && (
            <div>
              <div className="border-b border-zinc-800 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Library Results
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleSuggestionClick(item)
                    }
                    className="flex w-full items-start gap-4 border-b border-zinc-800/70 px-5 py-4 text-left transition last:border-b-0 hover:bg-zinc-900"
                  >
                    {/* Icon */}

                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-sm">
                      {item.type === "concept"
                        ? "💡"
                        : "✦"}
                    </div>

                    {/* Content */}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {item.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {item.type && (
                          <span className="capitalize">
                            {item.type}
                          </span>
                        )}

                        {item.category && (
                          <>
                            <span>•</span>

                            <span className="capitalize">
                              {item.category}
                            </span>
                          </>
                        )}
                      </div>

                      {item.description && (
                        <p className="mt-2 line-clamp-1 text-xs text-zinc-500">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}

                    <span className="mt-1 text-zinc-600 transition group-hover:text-orange-500">
                      →
                    </span>
                  </button>
                ))}
              </div>

              {/* View All */}

              <button
                type="button"
                onClick={handleViewAll}
                className="w-full border-t border-zinc-800 bg-zinc-900/50 px-5 py-3.5 text-center text-sm font-medium text-orange-500 transition hover:bg-zinc-900 hover:text-orange-400"
              >
                View all results →
              </button>
            </div>
          )}

          {/* No Results */}

          {!loading &&
            results.length === 0 && (
              <div className="px-5 py-7 text-center">
                <div className="text-2xl">
                  🔎
                </div>

                <p className="mt-2 text-sm font-medium text-white">
                  No library results found
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Try a different prompt,
                  concept or keyword.
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