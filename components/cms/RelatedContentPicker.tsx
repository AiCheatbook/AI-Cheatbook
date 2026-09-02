"use client";

import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import type {
  RelatedContentItem,
  RelatedContentType,
} from "@/lib/cms/relatedContent";
import { RELATED_CONTENT_LABEL } from "@/lib/cms/relatedContent";

type RelatedContentPickerProps = {
  value: RelatedContentItem[];
  onChange: (
    next: RelatedContentItem[]
  ) => void;

  /*
   * Excludes the item currently being
   * edited from its own search results.
   */
  excludeId?: string;
};

const SEARCH_TARGETS: {
  type: RelatedContentType;
  table: string;
}[] = [
  { type: "news", table: "news" },
  {
    type: "prompt",
    table: "library_items",
  },
  {
    type: "learning_card",
    table: "learning_cards",
  },
];

export default function RelatedContentPicker({
  value,
  onChange,
  excludeId,
}: RelatedContentPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    RelatedContentItem[]
  >([]);
  const [searching, setSearching] =
    useState(false);
  const [open, setOpen] = useState(false);

  async function runSearch(
    term: string
  ) {
    const trimmed = term.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setSearching(true);

    const allResults: RelatedContentItem[] =
      [];

    for (const target of SEARCH_TARGETS) {
      const { data } = await supabase
        .from(target.table)
        .select("id, slug, title")
        .ilike(
          "title",
          `%${trimmed}%`
        )
        .limit(5);

      for (const row of data || []) {
        if (row.id === excludeId) {
          continue;
        }

        allResults.push({
          type: target.type,
          id: row.id,
          slug: row.slug,
          title: row.title,
        });
      }
    }

    setResults(allResults);
    setSearching(false);
  }

  function addItem(
    item: RelatedContentItem
  ) {
    const alreadyAdded = value.some(
      (v) =>
        v.type === item.type &&
        v.id === item.id
    );

    if (alreadyAdded) {
      setQuery("");
      setOpen(false);
      return;
    }

    onChange([...value, item]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeItem(
    type: RelatedContentType,
    id: string
  ) {
    onChange(
      value.filter(
        (v) =>
          !(v.type === type && v.id === id)
      )
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="text-sm font-semibold text-white">
        Related Content
      </h3>

      <p className="mt-1 text-xs text-zinc-500">
        Manually link this to relevant
        News, Prompts, or Learning Cards.
        Shown to visitors, and helps Google
        discover your pages.
      </p>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            runSearch(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by title..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand"
        />

        {open &&
          (searching ||
            results.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg">
              {searching && (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  Searching...
                </div>
              )}

              {!searching &&
                results.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() =>
                      addItem(item)
                    }
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    <span className="truncate">
                      {item.title}
                    </span>
                    <span className="ml-2 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {
                        RELATED_CONTENT_LABEL[
                          item.type
                        ]
                      }
                    </span>
                  </button>
                ))}
            </div>
          )}
      </div>

      {value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            >
              <span className="truncate text-zinc-200">
                {item.title}
              </span>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {
                    RELATED_CONTENT_LABEL[
                      item.type
                    ]
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    removeItem(
                      item.type,
                      item.id
                    )
                  }
                  className="text-zinc-500 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
