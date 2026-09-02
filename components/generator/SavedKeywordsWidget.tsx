"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SAVED_KEYWORDS_STORAGE_KEY =
  "ai-cheatbook-saved-keywords";

const KEYWORDS_UPDATED_EVENT =
  "ai-cheatbook-keywords-updated";

export default function SavedKeywordsWidget() {
  const [keywords, setKeywords] = useState<string[]>(
    []
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    function loadKeywords() {
      try {
        const storedKeywords = JSON.parse(
          localStorage.getItem(
            SAVED_KEYWORDS_STORAGE_KEY
          ) || "[]"
        );

        setKeywords(
          Array.isArray(storedKeywords)
            ? storedKeywords
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load saved keywords:",
          error
        );

        setKeywords([]);
      }
    }

    const timer = window.setTimeout(() => {
      loadKeywords();
    }, 0);

    window.addEventListener(
      "storage",
      loadKeywords
    );

    window.addEventListener(
      KEYWORDS_UPDATED_EVENT,
      loadKeywords
    );

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        "storage",
        loadKeywords
      );

      window.removeEventListener(
        KEYWORDS_UPDATED_EVENT,
        loadKeywords
      );
    };
  }, []);

  function removeKeyword(
    keywordToRemove: string
  ) {
    const updatedKeywords = keywords.filter(
      (keyword) =>
        keyword !== keywordToRemove
    );

    localStorage.setItem(
      SAVED_KEYWORDS_STORAGE_KEY,
      JSON.stringify(updatedKeywords)
    );

    setKeywords(updatedKeywords);

    window.dispatchEvent(
      new Event(KEYWORDS_UPDATED_EVENT)
    );
  }

  function clearAllKeywords() {
    localStorage.removeItem(
      SAVED_KEYWORDS_STORAGE_KEY
    );

    setKeywords([]);

    window.dispatchEvent(
      new Event(KEYWORDS_UPDATED_EVENT)
    );

    setOpen(false);
  }

  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* Expanded Panel */}

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-3 w-80 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">

          {/* Header */}

          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">

            <div>
              <h3 className="font-semibold text-white">
                Saved Keywords
              </h3>

              <p className="mt-1 text-xs text-zinc-500">
                {keywords.length} saved
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="text-zinc-500 transition hover:text-white"
              aria-label="Close saved keywords"
            >
              ✕
            </button>

          </div>

          {/* Keywords */}

          <div className="max-h-64 overflow-y-auto p-4">

            <div className="space-y-2">

              {keywords.map((keyword) => (
                <div
                  key={keyword}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2"
                >

                  <span className="text-sm text-zinc-300">
                    {keyword}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeKeyword(keyword)
                    }
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Remove ${keyword}`}
                  >
                    ✕
                  </button>

                </div>
              ))}

            </div>

          </div>

          {/* Footer */}

          <div className="border-t border-zinc-800 p-3">

            <div className="flex gap-2">

              <button
                type="button"
                onClick={clearAllKeywords}
                className="flex-1 rounded-xl border border-zinc-700 px-3 py-3 text-sm font-semibold text-zinc-400 transition hover:border-red-500 hover:text-red-400"
              >
                Clear All
              </button>

              <Link
                href="/generator"
                onClick={() =>
                  setOpen(false)
                }
                className="flex-1 rounded-xl bg-brand px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Generator →
              </Link>

            </div>

          </div>

        </div>
      )}

      {/* Widget Button */}

      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 shadow-xl transition hover:border-brand"
        aria-expanded={open}
        aria-label="Toggle saved keywords"
      >

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg">
          💾
        </span>

        <span className="text-left">

          <span className="block text-sm font-semibold text-white">
            Saved Keywords
          </span>

          <span className="block text-xs text-zinc-500">
            {keywords.length} saved
          </span>

        </span>

        <span className="text-zinc-500">
          {open ? "↓" : "↑"}
        </span>

      </button>

    </div>
  );
}