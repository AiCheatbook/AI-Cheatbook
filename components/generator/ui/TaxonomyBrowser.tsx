"use client";

import { useEffect, useState } from "react";
import { Plus, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type Subcategory = { id: string; category_id: string; name: string };
type Concept = { id: string; subcategory_id: string; name: string };
type Keyword = { id: string; label: string; concept_id: string };
type StagedItem = { id: string; label: string };

type TaxonomyBrowserProps = {
  onInsertMultiple: (labels: string[]) => void;
  placements?: ("inline" | "global" | "both")[];
};

export default function TaxonomyBrowser({
  onInsertMultiple,
  placements = ["inline", "both"],
}: TaxonomyBrowserProps) {
  const [open, setOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [conceptId, setConceptId] = useState("");

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [staged, setStaged] = useState<StagedItem[]>([]);

  useEffect(() => {
    if (!open || loaded) return;

    async function load() {
      const [categoriesRes, subcategoriesRes, conceptsRes, keywordsRes] =
        await Promise.all([
          supabase
            .from("prompt_categories")
            .select("id, name")
            .order("sort_order", { ascending: true }),
          supabase
            .from("prompt_subcategories")
            .select("id, category_id, name")
            .order("sort_order", { ascending: true }),
          supabase
            .from("prompt_concepts")
            .select("id, subcategory_id, name")
            .order("sort_order", { ascending: true }),
          supabase
            .from("library_keywords")
            .select("id, label, concept_id")
            .in("placement", placements)
            .not("concept_id", "is", null)
            .order("label", { ascending: true }),
        ]);

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setConcepts(conceptsRes.data || []);
      setKeywords((keywordsRes.data || []) as Keyword[]);
      setLoaded(true);
      setLoadingKeywords(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded]);

  function isStaged(id: string) {
    return staged.some((k) => k.id === id);
  }

  function toggleStaged(item: StagedItem) {
    setStaged((prev) =>
      isStaged(item.id)
        ? prev.filter((k) => k.id !== item.id)
        : [...prev, item]
    );
  }

  function insertStaged() {
    if (staged.length === 0) return;
    onInsertMultiple(staged.map((k) => k.label));
    setStaged([]);
  }

  const visibleSubcategories = categoryId
    ? subcategories.filter((s) => s.category_id === categoryId)
    : [];
  const visibleConcepts = subcategoryId
    ? concepts.filter((c) => c.subcategory_id === subcategoryId)
    : [];
  const visibleKeywords = conceptId
    ? keywords.filter((k) => k.concept_id === conceptId)
    : [];

  function Row({
    active,
    label,
    onNavigate,
    item,
  }: {
    active: boolean;
    label: string;
    onNavigate?: () => void;
    item: StagedItem;
  }) {
    const selected = isStaged(item.id);

    return (
      <div
        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
          active ? "bg-brand/10 text-brand-text" : "text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        <button
          type="button"
          onClick={onNavigate}
          disabled={!onNavigate}
          className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"
        >
          <span className="truncate">{label}</span>
          {onNavigate && (
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2} />
          )}
        </button>
        <button
          type="button"
          onClick={() => toggleStaged(item)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
            selected
              ? "border-brand bg-brand text-white"
              : "border-zinc-300 text-zinc-400 hover:border-brand/50 hover:text-brand-text"
          }`}
        >
          {selected ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : (
            <Plus className="h-3 w-3" strokeWidth={3} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-brand/50"
      >
        Browse Categories
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[26rem] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Browse Taxonomy
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              Close
            </button>
          </div>

          <p className="mt-1 text-[11px] text-zinc-400">
            Tap a name to go deeper, tap + to select it (at any level).
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Category
              </p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-100 p-1">
                {categories.map((c) => (
                  <Row
                    key={c.id}
                    active={categoryId === c.id}
                    label={c.name}
                    item={{ id: c.id, label: c.name }}
                    onNavigate={() => {
                      setCategoryId(c.id);
                      setSubcategoryId("");
                      setConceptId("");
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Subcategory
              </p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-100 p-1">
                {!categoryId ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">
                    Select a Category first.
                  </p>
                ) : (
                  visibleSubcategories.map((s) => (
                    <Row
                      key={s.id}
                      active={subcategoryId === s.id}
                      label={s.name}
                      item={{ id: s.id, label: s.name }}
                      onNavigate={() => {
                        setSubcategoryId(s.id);
                        setConceptId("");
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Concept
              </p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-100 p-1">
                {!subcategoryId ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">
                    Select a Subcategory first.
                  </p>
                ) : (
                  visibleConcepts.map((c) => (
                    <Row
                      key={c.id}
                      active={conceptId === c.id}
                      label={c.name}
                      item={{ id: c.id, label: c.name }}
                      onNavigate={() => setConceptId(c.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Keyword
              </p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-100 p-1">
                {!conceptId ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">
                    Select a Concept first.
                  </p>
                ) : loadingKeywords ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">Loading...</p>
                ) : visibleKeywords.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">
                    No keywords here yet.
                  </p>
                ) : (
                  visibleKeywords.map((k) => (
                    <Row
                      key={k.id}
                      active={false}
                      label={k.label}
                      item={{ id: k.id, label: k.label }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {staged.length > 0 && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <p className="text-xs font-semibold text-zinc-700">
                Selected ({staged.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {staged.map((item) => (
                  <span
                    key={item.id}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                  >
                    {item.label}
                    <button
                      type="button"
                      onClick={() => toggleStaged(item)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={insertStaged}
                className="mt-2 w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-brand-dark"
              >
                Insert {staged.length} Selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
