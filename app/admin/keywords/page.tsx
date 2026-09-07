"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { findOrCreateKeyword } from "@/lib/cms/keywordLibrary";

type Keyword = {
  id: string;
  label: string;
  parent_id: string | null;
  placement: "inline" | "global" | "both";
  concept_id: string | null;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; category_id: string; name: string };
type Concept = { id: string; subcategory_id: string; name: string };

type UsagePrompt = { title: string; slug: string };

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [expandedUsageId, setExpandedUsageId] = useState<string | null>(null);
  const [loadingUsageId, setLoadingUsageId] = useState<string | null>(null);
  const [usageDetails, setUsageDetails] = useState<Record<string, UsagePrompt[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newKeywordLabel, setNewKeywordLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");

    const [keywordsRes, linksRes, categoriesRes, subcategoriesRes, conceptsRes] =
      await Promise.all([
        supabase
          .from("library_keywords")
          .select("id, label, parent_id, placement, concept_id")
          .order("label", { ascending: true }),
        supabase.from("library_item_keywords").select("keyword_id"),
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

    if (keywordsRes.error) {
      setError(keywordsRes.error.message);
      setLoading(false);
      return;
    }

    setKeywords((keywordsRes.data || []) as Keyword[]);
    setCategories(categoriesRes.data || []);
    setSubcategories(subcategoriesRes.data || []);
    setConcepts(conceptsRes.data || []);

    const counts: Record<string, number> = {};
    for (const row of linksRes.data || []) {
      counts[row.keyword_id] = (counts[row.keyword_id] || 0) + 1;
    }
    setUsageCounts(counts);

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  async function handleSetConcept(keywordId: string, conceptId: string) {
    setSavingId(keywordId);

    const { error: err } = await supabase
      .from("library_keywords")
      .update({ concept_id: conceptId || null })
      .eq("id", keywordId);

    if (!err) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId ? { ...k, concept_id: conceptId || null } : k
        )
      );
    }

    setSavingId(null);
  }

  async function handleSetParent(keywordId: string, parentId: string) {
    setSavingId(keywordId);

    const { error: err } = await supabase
      .from("library_keywords")
      .update({ parent_id: parentId || null })
      .eq("id", keywordId);

    if (!err) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId ? { ...k, parent_id: parentId || null } : k
        )
      );
    }

    setSavingId(null);
  }

  async function handleSetPlacement(
    keywordId: string,
    placement: "inline" | "global" | "both"
  ) {
    setSavingId(keywordId);

    const { error: err } = await supabase
      .from("library_keywords")
      .update({ placement })
      .eq("id", keywordId);

    if (!err) {
      setKeywords((current) =>
        current.map((k) => (k.id === keywordId ? { ...k, placement } : k))
      );
    }

    setSavingId(null);
  }

  async function handleDelete(keyword: Keyword) {
    if (
      !confirm(
        `Delete "${keyword.label}"? This removes it everywhere it's used across the site, not just here.`
      )
    ) {
      return;
    }

    setSavingId(keyword.id);
    setError("");

    const { error: err } = await supabase
      .from("library_keywords")
      .delete()
      .eq("id", keyword.id);

    if (err) {
      setError(
        err.code === "23503"
          ? `Couldn't delete "${keyword.label}" — other keywords are nested under it. Reassign them first.`
          : err.message
      );
      setSavingId(null);
      return;
    }

    setKeywords((current) => current.filter((k) => k.id !== keyword.id));
    setSavingId(null);
  }

  async function handleRename(keyword: Keyword) {
    const trimmed = editLabel.trim();
    if (!trimmed || trimmed === keyword.label) {
      setEditingId(null);
      return;
    }

    setSavingId(keyword.id);
    setError("");

    const { error: err } = await supabase
      .from("library_keywords")
      .update({ label: trimmed })
      .eq("id", keyword.id);

    if (err) {
      setError(
        err.code === "23505"
          ? `A keyword matching "${trimmed}" already exists — that's the same keyword under a different spelling/casing.`
          : err.message
      );
      setSavingId(null);
      return;
    }

    setKeywords((current) =>
      current.map((k) => (k.id === keyword.id ? { ...k, label: trimmed } : k))
    );
    setEditingId(null);
    setSavingId(null);
  }

  async function toggleUsage(keyword: Keyword) {
    if (expandedUsageId === keyword.id) {
      setExpandedUsageId(null);
      return;
    }

    setExpandedUsageId(keyword.id);

    if (usageDetails[keyword.id]) return;

    setLoadingUsageId(keyword.id);

    const { data: links } = await supabase
      .from("library_item_keywords")
      .select("library_item_id")
      .eq("keyword_id", keyword.id);

    const itemIds = (links || []).map((l) => l.library_item_id);

    if (itemIds.length === 0) {
      setUsageDetails((prev) => ({ ...prev, [keyword.id]: [] }));
      setLoadingUsageId(null);
      return;
    }

    const { data: items } = await supabase
      .from("library_items")
      .select("title, slug")
      .in("id", itemIds);

    setUsageDetails((prev) => ({
      ...prev,
      [keyword.id]: (items || []) as UsagePrompt[],
    }));
    setLoadingUsageId(null);
  }

  async function handleCreate() {
    const trimmed = newKeywordLabel.trim();
    if (!trimmed) return;

    setCreating(true);
    setError("");

    try {
      await findOrCreateKeyword(trimmed);
      await loadAll();
      setNewKeywordLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create keyword.");
    }

    setCreating(false);
  }

  function conceptBreadcrumb(conceptId: string): string {
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return "";
    const sub = subcategories.find((s) => s.id === concept.subcategory_id);
    const cat = sub ? categories.find((c) => c.id === sub.category_id) : null;
    return [cat?.name, sub?.name, concept.name].filter(Boolean).join(" → ");
  }

  function keywordBreadcrumb(keyword: Keyword): string {
    const path = keyword.concept_id ? conceptBreadcrumb(keyword.concept_id) : "";
    return path ? `${path} → ${keyword.label}` : keyword.label;
  }

  function KeywordRow({ keyword }: { keyword: Keyword }) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 py-2">
          <div className="min-w-0 flex-1">
            {editingId === keyword.id ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(keyword);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleRename(keyword)}
                className="w-full rounded-lg border border-brand bg-white px-2 py-1 text-sm text-zinc-900 outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(keyword.id);
                  setEditLabel(keyword.label);
                }}
                className="block truncate text-left text-sm text-zinc-900 hover:underline"
                title="Click to rename"
              >
                {keyword.label}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleUsage(keyword)}
            className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
          >
            {usageCounts[keyword.id] || 0} prompt
            {usageCounts[keyword.id] === 1 ? "" : "s"}
          </button>

          <select
            value={keyword.concept_id || ""}
            disabled={savingId === keyword.id}
            onChange={(e) => handleSetConcept(keyword.id, e.target.value)}
            title="Move to a different Concept"
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none"
          >
            <option value="">Uncategorized</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {conceptBreadcrumb(c.id)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={savingId === keyword.id}
            onClick={() =>
              handleSetPlacement(
                keyword.id,
                keyword.placement === "inline"
                  ? "global"
                  : keyword.placement === "global"
                    ? "both"
                    : "inline"
              )
            }
            title="Where this keyword can appear in the Prompt Designer: Inline (inserted directly into the sentence), Global (shown in the 'Global Keywords' box), or Both."
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              keyword.placement === "inline"
                ? "bg-brand/15 text-brand-text"
                : keyword.placement === "global"
                  ? "bg-zinc-100 text-zinc-600"
                  : "bg-blue-500/15 text-blue-600"
            }`}
          >
            {keyword.placement === "inline"
              ? "Inline"
              : keyword.placement === "global"
                ? "Global"
                : "Both"}
          </button>

          <button
            type="button"
            disabled={savingId === keyword.id}
            onClick={() => handleDelete(keyword)}
            className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 pl-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-400">
            Designer parent (optional):
          </span>
          <select
            value={keyword.parent_id || ""}
            disabled={savingId === keyword.id}
            onChange={(e) => handleSetParent(keyword.id, e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 outline-none"
          >
            <option value="">(none)</option>
            {keywords
              .filter((k) => k.id !== keyword.id)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
          </select>
        </div>

        {expandedUsageId === keyword.id && (
          <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2">
            {loadingUsageId === keyword.id ? (
              <p className="text-xs text-zinc-500">Loading...</p>
            ) : (usageDetails[keyword.id] || []).length === 0 ? (
              <p className="text-xs text-zinc-500">Not used by any prompt yet.</p>
            ) : (
              <ul className="space-y-1">
                {(usageDetails[keyword.id] || []).map((p) => (
                  <li key={p.slug}>
                    <a
                      href={`/prompt/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-text hover:underline"
                    >
                      {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  const uncategorizedKeywords = keywords.filter((k) => !k.concept_id);
  const searchMatches = searchQuery.trim()
    ? keywords.filter((k) =>
        k.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
          Admin
        </p>

        <h1 className="mt-1 text-3xl font-bold">Global Keyword Library</h1>

        <p className="mt-2 text-zinc-600">
          Organized by the same Category → Subcategory → Concept taxonomy
          that governs the Prompt Library — not a separate hierarchy.
          Search, create, rename, or delete any keyword, move it to a
          different Concept, and see exactly how many prompts use it.
        </p>

        <p className="mt-2 text-xs text-zinc-500">
          The small &quot;Designer parent&quot; control on each keyword is
          separate — it only affects the breadcrumb suggestions shown while
          typing in the Prompt Designer, and doesn&apos;t need to match the
          taxonomy above.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newKeywordLabel}
            onChange={(e) => setNewKeywordLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="+ Create a new keyword"
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={creating || !newKeywordLabel.trim()}
            onClick={handleCreate}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Add"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-zinc-100" />
        )}

        {!loading && !error && keywords.length === 0 && (
          <p className="mt-8 text-center text-zinc-600">No keywords yet.</p>
        )}

        {!loading && !error && searchQuery.trim() && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
            {searchMatches.length === 0 ? (
              <p className="text-sm text-zinc-500">No matches.</p>
            ) : (
              searchMatches.map((k) => (
                <div key={k.id} className="border-b border-zinc-100 py-1 last:border-b-0">
                  <p className="px-1 pt-2 text-xs text-zinc-500">
                    {keywordBreadcrumb(k)}
                  </p>
                  <KeywordRow keyword={k} />
                </div>
              ))
            )}
          </div>
        )}

        {!loading && !error && !searchQuery.trim() && (
          <div className="mt-6 space-y-6">
            {categories.map((category) => {
              const categorySubcategories = subcategories.filter(
                (s) => s.category_id === category.id
              );

              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <h2 className="text-lg font-bold text-zinc-900">
                    {category.name}
                  </h2>

                  {categorySubcategories.length === 0 && (
                    <p className="mt-2 text-xs text-zinc-400">
                      No subcategories yet.
                    </p>
                  )}

                  <div className="mt-3 space-y-4 pl-4">
                    {categorySubcategories.map((subcategory) => {
                      const subcategoryConcepts = concepts.filter(
                        (c) => c.subcategory_id === subcategory.id
                      );

                      return (
                        <div key={subcategory.id}>
                          <h3 className="text-sm font-semibold text-zinc-700">
                            {subcategory.name}
                          </h3>

                          {subcategoryConcepts.length === 0 && (
                            <p className="mt-1 text-xs text-zinc-400">
                              No concepts yet.
                            </p>
                          )}

                          <div className="mt-2 space-y-3 pl-4">
                            {subcategoryConcepts.map((concept) => {
                              const conceptKeywords = keywords.filter(
                                (k) => k.concept_id === concept.id
                              );

                              return (
                                <div key={concept.id}>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    {concept.name}
                                  </p>

                                  {conceptKeywords.length === 0 ? (
                                    <p className="mt-1 text-xs text-zinc-400">
                                      No keywords yet.
                                    </p>
                                  ) : (
                                    <div className="mt-1">
                                      {conceptKeywords.map((k) => (
                                        <KeywordRow key={k.id} keyword={k} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
              <h2 className="text-sm font-semibold text-zinc-700">
                Uncategorized Keywords
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Not yet assigned to a Concept — use the dropdown on each one
                to move it in.
              </p>

              {uncategorizedKeywords.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-400">None — every keyword is categorized.</p>
              ) : (
                <div className="mt-2">
                  {uncategorizedKeywords.map((k) => (
                    <KeywordRow key={k.id} keyword={k} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
