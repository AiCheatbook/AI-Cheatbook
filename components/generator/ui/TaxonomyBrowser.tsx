"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type Subcategory = { id: string; category_id: string; name: string };
type Concept = { id: string; subcategory_id: string; name: string };
type Keyword = { id: string; label: string };

type TaxonomyBrowserProps = {
  onInsert: (label: string) => void;
};

export default function TaxonomyBrowser({ onInsert }: TaxonomyBrowserProps) {
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
  const [staged, setStaged] = useState<Keyword[]>([]);

  useEffect(() => {
    if (!open || loaded) return;

    async function load() {
      const [categoriesRes, subcategoriesRes, conceptsRes] =
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
        ]);

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
      setConcepts(conceptsRes.data || []);
      setLoaded(true);
    }

    load();
  }, [open, loaded]);

  useEffect(() => {
    if (!conceptId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeywords([]);
      return;
    }

    async function load() {
      setLoadingKeywords(true);

      const { data } = await supabase
        .from("library_keywords")
        .select("id, label")
        .eq("concept_id", conceptId)
        .in("placement", ["inline", "both"])
        .order("label", { ascending: true });

      setKeywords(data || []);
      setLoadingKeywords(false);
    }

    load();
  }, [conceptId]);

  function isStaged(id: string) {
    return staged.some((k) => k.id === id);
  }

  function toggleStaged(keyword: Keyword) {
    setStaged((prev) =>
      isStaged(keyword.id)
        ? prev.filter((k) => k.id !== keyword.id)
        : [...prev, keyword]
    );
  }

  function insertStaged() {
    if (staged.length === 0) return;
    onInsert(staged.map((k) => k.label).join(", "));
    setStaged([]);
  }

  const visibleSubcategories = categoryId
    ? subcategories.filter((s) => s.category_id === categoryId)
    : [];
  const visibleConcepts = subcategoryId
    ? concepts.filter((c) => c.subcategory_id === subcategoryId)
    : [];

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
        <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
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

          <div className="mt-3 space-y-2">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
                setConceptId("");
              }}
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={subcategoryId}
              disabled={!categoryId}
              onChange={(e) => {
                setSubcategoryId(e.target.value);
                setConceptId("");
              }}
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">Select Subcategory</option>
              {visibleSubcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={conceptId}
              disabled={!subcategoryId}
              onChange={(e) => setConceptId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">Select Concept</option>
              {visibleConcepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {conceptId && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <p className="text-xs text-zinc-500">
                {loadingKeywords
                  ? "Loading keywords..."
                  : keywords.length === 0
                    ? "No keywords under this Concept yet."
                    : "Click the + to select — you can pick more after switching Category/Subcategory/Concept."}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((k) => {
                  const selected = isStaged(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => toggleStaged(k)}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                        selected
                          ? "border-brand bg-brand/10 text-brand-text"
                          : "border-zinc-200 text-zinc-700 hover:border-brand/50 hover:bg-brand/5"
                      }`}
                    >
                      {k.label}
                      {selected ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      ) : (
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {staged.length > 0 && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <p className="text-xs font-semibold text-zinc-700">
                Selected ({staged.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {staged.map((k) => (
                  <span
                    key={k.id}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                  >
                    {k.label}
                    <button
                      type="button"
                      onClick={() => toggleStaged(k)}
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
