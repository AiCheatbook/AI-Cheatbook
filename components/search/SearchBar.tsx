"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery =
    searchParams.get("q") || "";

  const [query, setQuery] =
    useState(currentQuery);

  const debounceTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  function performSearch(
    value: string
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    const trimmedQuery =
      value.trim();

    /*
     * Update search query
     */

    if (trimmedQuery) {
      params.set(
        "q",
        trimmedQuery
      );
    } else {
      params.delete("q");
    }

    /*
     * New search means:
     * remove previously selected card.
     */

    params.delete("selected");

    const queryString =
      params.toString();

    router.replace(
      queryString
        ? `/search?${queryString}`
        : "/search",
      {
        scroll: false,
      }
    );
  }

  function updateSearch(
    value: string
  ) {
    /*
     * Update input immediately.
     */

    setQuery(value);

    /*
     * Cancel previous timer.
     */

    if (debounceTimer.current) {
      clearTimeout(
        debounceTimer.current
      );
    }

    /*
     * Wait 300ms before updating
     * the Library results.
     */

    debounceTimer.current =
      setTimeout(() => {
        performSearch(value);
      }, 300);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /*
     * Cancel pending live search.
     */

    if (debounceTimer.current) {
      clearTimeout(
        debounceTimer.current
      );
    }

    /*
     * Search immediately.
     */

    performSearch(query);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative"
    >
      <div className="relative">

        {/* Search Icon */}

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
          />

          <path d="m20 20-3.5-3.5" />
        </svg>

        {/* Search Input */}

        <input
          type="text"
          value={query}
          onChange={(event) =>
            updateSearch(
              event.target.value
            )
          }
          placeholder="Search prompts, keywords, concepts, AI tools..."
          aria-label="Search AI Cheatbook Library"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-zinc-200 bg-white/80 pl-14 pr-32 text-zinc-900 outline-none placeholder:text-zinc-600 transition focus:border-brand focus:bg-white"
        />

        {/* Search Button */}

        <button
          type="submit"
          className="absolute right-2 top-2 h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
        >
          Search
        </button>

      </div>
    </form>
  );
}