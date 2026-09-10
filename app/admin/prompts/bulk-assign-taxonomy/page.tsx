"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type PromptRow = {
  id: string;
  title: string;
  concept_id: string | null;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; category_id: string; name: string };
type Concept = { id: string; subcategory_id: string; name: string };

export default function BulkAssignTaxonomyPage() {
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [conceptId, setConceptId] = useState("");

  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState("");

  async function loadAll() {
    setLoading(true);

    const [promptsRes, catsRes, subsRes, conceptsRes] = await Promise.all([
      supabase.from("library_items").select("id, title, concept_id"),
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

    setPrompts(promptsRes.data || []);
    setCategories(catsRes.data || []);
    setSubcategories(subsRes.data || []);
    setConcepts(conceptsRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  const visibleSubcategories = categoryId
    ? subcategories.filter((s) => s.category_id === categoryId)
    : [];
  const visibleConcepts = subcategoryId
    ? concepts.filter((c) => c.subcategory_id === subcategoryId)
    : [];

  const filteredPrompts = prompts.filter((p) => {
    if (showUncategorizedOnly && p.concept_id) return false;
    if (
      searchQuery.trim() &&
      !p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredPrompts.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function assignToSelected() {
    if (!conceptId || selectedIds.size === 0) return;

    setAssigning(true);
    setResult("");

    const { error } = await supabase
      .from("library_items")
      .update({ concept_id: conceptId })
      .in("id", Array.from(selectedIds));

    if (error) {
      setResult(`Failed: ${error.message}`);
    } else {
      setResult(`Assigned ${selectedIds.size} prompt(s) successfully.`);
      await loadAll();
      setSelectedIds(new Set());
    }

    setAssigning(false);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Bulk Assign Taxonomy</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Select many prompts at once and assign them all to a Category →
          Subcategory → Concept in a single action — for prompts that were
          bulk-imported without taxonomy data filled in.
        </p>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold text-zinc-900">
            Assign selected prompts to:
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
                setConceptId("");
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
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
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-40"
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
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">Select Concept</option>
              {visibleConcepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!conceptId || selectedIds.size === 0 || assigning}
            onClick={assignToSelected}
            className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {assigning
              ? "Assigning..."
              : `Assign ${selectedIds.size} Selected Prompt${
                  selectedIds.size === 1 ? "" : "s"
                }`}
          </button>

          {result && <p className="mt-2 text-sm text-zinc-600">{result}</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title..."
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-brand"
          />

          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={showUncategorizedOnly}
              onChange={(e) => setShowUncategorizedOnly(e.target.checked)}
            />
            Uncategorized only
          </label>

          <button
            type="button"
            onClick={selectAllVisible}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand/50"
          >
            Select All Visible
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-brand/50"
          >
            Clear Selection
          </button>
        </div>

        {loading ? (
          <div className="mt-4 h-64 animate-pulse rounded-2xl bg-zinc-100" />
        ) : (
          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-2xl border border-zinc-200">
            {filteredPrompts.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-500">
                No prompts match.
              </p>
            ) : (
              filteredPrompts.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-4 py-2.5 text-sm hover:bg-zinc-50 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-zinc-900">
                    {p.title}
                  </span>
                  {!p.concept_id && (
                    <span className="shrink-0 text-xs text-amber-600">
                      Uncategorized
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
