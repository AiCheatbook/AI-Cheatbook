"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type KeywordRow = {
  id: string;
  label: string;
  category: string | null;
  parent_id: string | null;
};

type KeywordDiscoveryProps = {
  query: string;
  onSelect: (label: string) => void;
  alreadySelected: string[];
};

export default function KeywordDiscovery({
  query,
  onSelect,
  alreadySelected,
}: KeywordDiscoveryProps) {
  const [allKeywords, setAllKeywords] =
    useState<KeywordRow[]>([]);
  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("library_keywords")
        .select(
          "id, label, category, parent_id"
        );

      setAllKeywords(
        (data || []) as KeywordRow[]
      );
      setLoaded(true);
    }

    load();
  }, []);

  const keywordById = useMemo(() => {
    const map = new Map<
      string,
      KeywordRow
    >();

    for (const k of allKeywords) {
      map.set(k.id, k);
    }

    return map;
  }, [allKeywords]);

  function breadcrumbFor(
    keyword: KeywordRow
  ): string {
    const path: string[] = [
      keyword.label,
    ];

    let current = keyword;
    let depth = 0;

    while (current.parent_id && depth < 5) {
      const parent = keywordById.get(
        current.parent_id
      );

      if (!parent) {
        break;
      }

      path.unshift(parent.label);
      current = parent;
      depth += 1;
    }

    return path.join(" → ");
  }

  const trimmedQuery = query
    .trim()
    .toLowerCase();

  const matches = useMemo(() => {
    if (trimmedQuery.length < 2) {
      return [];
    }

    return allKeywords
      .filter(
        (k) =>
          k.label
            .toLowerCase()
            .includes(trimmedQuery) &&
          !alreadySelected.includes(
            k.label
          )
      )
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery, allKeywords]);

  if (
    trimmedQuery.length < 2 ||
    !loaded ||
    matches.length === 0
  ) {
    return null;
  }

  return (
    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
      {matches.map((keyword) => (
        <button
          key={keyword.id}
          type="button"
          onClick={() =>
            onSelect(keyword.label)
          }
          className="flex w-full items-center justify-between border-b border-zinc-800 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-zinc-800"
        >
          <span className="text-zinc-600">
            {breadcrumbFor(keyword)}
          </span>

          <span className="ml-3 shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
            Add
          </span>
        </button>
      ))}
    </div>
  );
}
