"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type GlobalKeywordRow = {
  id: string;
  label: string;
};

type GlobalKeywordsBarProps = {
  selected: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
};

/*
 * GLOBAL KEYWORDS ONLY.
 *
 * Completely independent from the main
 * prompt editor's typing/autocomplete —
 * this component has its own trigger
 * ("+ Add"), its own search query state,
 * and its own data fetch (only
 * "global"/"both" placement keywords).
 * Nothing here is ever driven by what the
 * user types in the sentence above.
 */

export default function GlobalKeywordsBar({
  selected,
  onAdd,
  onRemove,
}: GlobalKeywordsBarProps) {
  const [pickerOpen, setPickerOpen] =
    useState(false);
  const [query, setQuery] = useState("");
  const [allKeywords, setAllKeywords] =
    useState<GlobalKeywordRow[]>([]);
  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    if (!pickerOpen || loaded) {
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("library_keywords")
        .select("id, label")
        .in("placement", [
          "global",
          "both",
        ]);

      setAllKeywords(
        (data ||
          []) as GlobalKeywordRow[]
      );
      setLoaded(true);
    }

    load();
  }, [pickerOpen, loaded]);

  const trimmedQuery = query
    .trim()
    .toLowerCase();

  const matches = allKeywords.filter(
    (k) =>
      k.label
        .toLowerCase()
        .includes(trimmedQuery)
  );

  function handlePick(label: string) {
    onAdd(label);
    setQuery("");
    setPickerOpen(false);
  }

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
        Global Keywords
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        Applied to the whole generated
        prompt — never inserted into the
        sentence.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {selected.map((keyword) => (
          <span
            key={keyword}
            className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand-text"
          >
            {keyword}
            <button
              type="button"
              onClick={() =>
                onRemove(keyword)
              }
              aria-label={`Remove ${keyword}`}
              className="text-brand-text/70 hover:text-zinc-900"
            >
              ×
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setPickerOpen((v) => !v)
            }
            className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:border-brand hover:text-brand-text"
          >
            + Add
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-8 z-30 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
              <input
                autoFocus
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search global keywords..."
                className="w-full border-b border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none"
              />

              <div className="max-h-48 overflow-y-auto">
                {!loaded && (
                  <p className="px-3 py-2 text-xs text-zinc-600">
                    Loading...
                  </p>
                )}

                {loaded &&
                  matches.length ===
                    0 && (
                    <p className="px-3 py-2 text-xs text-zinc-600">
                      No matches.
                    </p>
                  )}

                {matches.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() =>
                      handlePick(k.label)
                    }
                    className="block w-full px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100"
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
