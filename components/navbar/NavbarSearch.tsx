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

/*
 * The site's global search, now living in
 * the navbar as a compact toggle instead of
 * a permanent hero element — same real
 * search logic as before (library, news,
 * learning, community threads, polls), just
 * a different entry point.
 */

export default function NavbarSearch() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    SearchResult[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);
  const inputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

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
            description: item.description,
            href: `/prompt/${item.slug}`,
            sourceLabel: "AI Library",
            icon: SOURCE_ICON["AI Library"],
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
            description: item.summary,
            href: `/learning/${item.slug}`,
            sourceLabel: "Learning",
            icon: SOURCE_ICON["Learning"],
          });
        }

        for (const item of threadsResponse.data ||
          []) {
          const label =
            item.content_kind === "question"
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
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setShowSuggestions(false);
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setShowSuggestions(false);
    setOpen(false);

    router.push(
      trimmedQuery
        ? `/search?q=${encodeURIComponent(trimmedQuery)}`
        : "/search"
    );
  }

  function handleSuggestionClick(
    item: SearchResult
  ) {
    setShowSuggestions(false);
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  const shouldShowDropdown =
    showSuggestions && query.trim().length > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search AI Cheatbook"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:border-brand hover:text-brand"
      >
        🔍
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search AI Cheatbook..."
            aria-label="Search AI Cheatbook"
            className="h-10 w-56 rounded-l-xl border border-r-0 border-zinc-200 bg-white pl-4 pr-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand sm:w-72"
          />

          <button
            type="submit"
            className="h-10 rounded-r-xl border border-zinc-200 bg-brand px-3 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
          >
            {loading ? "…" : "Search"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
              setShowSuggestions(false);
            }}
            aria-label="Close search"
            className="ml-2 text-sm text-zinc-400 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>
      </form>

      {shouldShowDropdown && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:w-96">
          {loading && results.length === 0 && (
            <div className="px-5 py-6 text-sm text-zinc-400">
              Searching AI Cheatbook...
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleSuggestionClick(item)
                  }
                  className="flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-brand-light"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm">
                    {item.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.title}
                    </p>

                    <span className="mt-0.5 inline-block rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-dark">
                      {item.sourceLabel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-zinc-400">
              No results found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
