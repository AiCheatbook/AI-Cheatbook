"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { findOrCreateKeyword } from "@/lib/cms/keywordLibrary";

type KeywordRow = {
  id: string;
  label: string;
  category: string | null;
  parent_id: string | null;
  placement: "inline" | "global" | "both";
  concept_id: string | null;
};

type TaxonomyConcept = { id: string; name: string; subcategory_id: string };
type TaxonomySubcategory = { id: string; name: string; category_id: string };
type TaxonomyCategory = { id: string; name: string };

export type ComposerKeywordMatch = {
  label: string;
  breadcrumb: string;
};

type ComposerKeywordSearchProps = {
  query: string;
  onSelect: (
    match: ComposerKeywordMatch
  ) => void;
};

/*
 * INLINE KEYWORDS ONLY.
 *
 * This component has no knowledge of
 * Global Keywords whatsoever — not in its
 * data fetching, not in its filtering, not
 * in its rendering. It exists purely for
 * the "type in the sentence, get inline
 * suggestions" flow. Global Keywords are a
 * fully separate system with their own
 * component (GlobalKeywordsBar) and their
 * own, independently-triggered search —
 * never this one.
 *
 * The keyword library itself is never
 * filtered based on what's already used —
 * the same keyword can be inserted as many
 * times as needed.
 */

export default function ComposerKeywordSearch({
  query,
  onSelect,
}: ComposerKeywordSearchProps) {
  const [allKeywords, setAllKeywords] =
    useState<KeywordRow[]>([]);
  const [loaded, setLoaded] =
    useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomySubcategory[]>([]);
  const [concepts, setConcepts] = useState<TaxonomyConcept[]>([]);

  useEffect(() => {
    async function load() {
      const [keywordsRes, categoriesRes, subcategoriesRes, conceptsRes] =
        await Promise.all([
          supabase
            .from("library_keywords")
            .select("id, label, category, parent_id, placement, concept_id")
            .in("placement", ["inline", "both"]),
          supabase.from("prompt_categories").select("id, name"),
          supabase.from("prompt_subcategories").select("id, name, category_id"),
          supabase.from("prompt_concepts").select("id, name, subcategory_id"),
        ]);

      setAllKeywords((keywordsRes.data || []) as KeywordRow[]);
      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setConcepts(conceptsRes.data || []);
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
    if (keyword.concept_id) {
      const concept = concepts.find((c) => c.id === keyword.concept_id);
      const subcategory = concept
        ? subcategories.find((s) => s.id === concept.subcategory_id)
        : null;
      const category = subcategory
        ? categories.find((c) => c.id === subcategory.category_id)
        : null;

      if (concept) {
        return [category?.name, subcategory?.name, concept.name, keyword.label]
          .filter(Boolean)
          .join(" → ");
      }
    }

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

  async function handleCreate() {
    const label = query.trim();
    if (!label) return;

    setCreating(true);
    setCreateError("");

    try {
      const keyword = await findOrCreateKeyword(label);
      setAllKeywords((prev) =>
        prev.some((k) => k.id === keyword.id)
          ? prev
          : [
              ...prev,
              {
                id: keyword.id,
                label: keyword.label,
                category: null,
                parent_id: null,
                placement: "both",
                concept_id: null,
              },
            ]
      );
      onSelect({ label: keyword.label, breadcrumb: keyword.label });
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "Failed to create keyword. Make sure you're logged in."
      );
    }

    setCreating(false);
  }

  const trimmedQuery = query
    .trim()
    .toLowerCase();

  const matches = useMemo(() => {
    if (trimmedQuery.length < 2) {
      return [];
    }

    return allKeywords
      .filter((k) =>
        k.label
          .toLowerCase()
          .includes(trimmedQuery)
      )
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery, allKeywords]);

  if (trimmedQuery.length < 2 || !loaded) {
    return null;
  }

  if (matches.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          disabled={creating}
          onClick={handleCreate}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-zinc-100 disabled:opacity-50"
        >
          <span className="truncate text-zinc-600">
            {creating
              ? "Creating..."
              : `+ Create "${query.trim()}" as a new keyword`}
          </span>
        </button>
        {createError && (
          <p className="border-t border-zinc-200 px-4 py-2 text-xs text-red-600">
            {createError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <p className="bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-text">
        Inline Keywords
      </p>

      {matches.map((keyword) => (
        <button
          key={keyword.id}
          type="button"
          onClick={() =>
            onSelect({
              label: keyword.label,
              breadcrumb:
                breadcrumbFor(keyword),
            })
          }
          className="flex w-full items-center justify-between border-b border-zinc-200 px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-zinc-100"
        >
          <span className="truncate text-zinc-600">
            {breadcrumbFor(keyword)}
          </span>

          <span className="ml-3 shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand-text">
            Insert
          </span>
        </button>
      ))}
    </div>
  );
}
