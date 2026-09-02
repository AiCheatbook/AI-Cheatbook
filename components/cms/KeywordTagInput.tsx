"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

export type SelectedKeyword = {
  id: string;
  label: string;
};

type KeywordTagInputProps = {
  value: SelectedKeyword[];
  onChange: (next: SelectedKeyword[]) => void;
};

type KeywordRow = {
  id: string;
  label: string;
};

/*
 * Lets an employee type a keyword name.
 *
 * - If a matching keyword already exists in
 *   library_keywords, it's reused.
 * - If not, a brand new one is created when
 *   they save the prompt.
 */

export default function KeywordTagInput({
  value,
  onChange,
}: KeywordTagInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] =
    useState<KeywordRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function search() {
      const trimmed = query.trim();

      if (!trimmed) {
        setSuggestions([]);
        return;
      }

      const { data } = await supabase
        .from("library_keywords")
        .select("id, label")
        .ilike("label", `%${trimmed}%`)
        .limit(6);

      if (!cancelled) {
        setSuggestions(
          (data as KeywordRow[]) || []
        );
      }
    }

    const timeout = setTimeout(
      search,
      200
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function addKeyword(
    keyword: SelectedKeyword
  ) {
    const alreadyAdded = value.some(
      (item) =>
        item.label.toLowerCase() ===
        keyword.label.toLowerCase()
    );

    if (alreadyAdded) {
      setQuery("");
      setOpen(false);
      return;
    }

    onChange([...value, keyword]);
    setQuery("");
    setOpen(false);
  }

  function addFromTyped() {
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    const existingMatch =
      suggestions.find(
        (s) =>
          s.label.toLowerCase() ===
          trimmed.toLowerCase()
      );

    if (existingMatch) {
      addKeyword(existingMatch);
      return;
    }

    /*
     * New keyword — no id yet.
     * A real id gets created in Supabase
     * when the prompt is saved.
     */

    addKeyword({
      id: `new:${trimmed}`,
      label: trimmed,
    });
  }

  function removeKeyword(id: string) {
    onChange(
      value.filter(
        (item) => item.id !== id
      )
    );
  }

  return (
    <div className="relative">
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
        {value.map((keyword) => (
          <span
            key={keyword.id}
            className="flex items-center gap-1 rounded-full bg-brand/15 px-3 py-1 text-xs text-brand"
          >
            {keyword.label}
            <button
              type="button"
              onClick={() =>
                removeKeyword(keyword.id)
              }
              className="text-brand hover:text-brand"
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromTyped();
            }
          }}
          placeholder={
            value.length === 0
              ? "Type a keyword and press Enter..."
              : "Add another..."
          }
          className="min-w-32 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addKeyword(s)}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
