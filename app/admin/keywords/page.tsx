"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { findOrCreateKeyword } from "@/lib/cms/keywordLibrary";

type Keyword = {
  id: string;
  label: string;
  category: string | null;
  parent_id: string | null;
  placement: "inline" | "global" | "both";
  concept_id: string | null;
};

type UsagePrompt = { title: string; slug: string };

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<
    Keyword[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [conceptNames, setConceptNames] = useState<Record<string, string>>({});
  const [expandedUsageId, setExpandedUsageId] = useState<string | null>(null);
  const [loadingUsageId, setLoadingUsageId] = useState<string | null>(null);
  const [usageDetails, setUsageDetails] = useState<
    Record<string, UsagePrompt[]>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newKeywordLabel, setNewKeywordLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadKeywords() {
    setLoading(true);
    setError("");

    const [keywordsRes, linksRes] = await Promise.all([
      supabase
        .from("library_keywords")
        .select(
          "id, label, category, parent_id, placement, concept_id"
        )
        .order("label", {
          ascending: true,
        }),
      supabase.from("library_item_keywords").select("keyword_id"),
    ]);

    if (keywordsRes.error) {
      setError(keywordsRes.error.message);
      setLoading(false);
      return;
    }

    const loadedKeywords = (keywordsRes.data || []) as Keyword[];
    setKeywords(loadedKeywords);

    const counts: Record<string, number> = {};
    for (const row of linksRes.data || []) {
      counts[row.keyword_id] = (counts[row.keyword_id] || 0) + 1;
    }
    setUsageCounts(counts);

    const conceptIds = Array.from(
      new Set(
        loadedKeywords
          .map((k) => k.concept_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (conceptIds.length > 0) {
      const { data: concepts } = await supabase
        .from("prompt_concepts")
        .select("id, name")
        .in("id", conceptIds);

      const names: Record<string, string> = {};
      for (const c of concepts || []) {
        names[c.id] = c.name;
      }
      setConceptNames(names);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeywords();
  }, []);

  async function handleSetParent(
    keywordId: string,
    parentId: string
  ) {
    setSavingId(keywordId);

    const { error } = await supabase
      .from("library_keywords")
      .update({
        parent_id: parentId || null,
      })
      .eq("id", keywordId);

    if (!error) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId
            ? {
                ...k,
                parent_id:
                  parentId || null,
              }
            : k
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

    const { error } = await supabase
      .from("library_keywords")
      .update({ placement })
      .eq("id", keywordId);

    if (!error) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId
            ? { ...k, placement }
            : k
        )
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

    if (usageDetails[keyword.id]) {
      return;
    }

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

  const topLevel = keywords.filter(
    (k) => !k.parent_id
  );

  function childrenOf(
    parentId: string
  ): Keyword[] {
    return keywords.filter(
      (k) => k.parent_id === parentId
    );
  }

  function breadcrumbFor(keyword: Keyword): string {
    const path = [keyword.label];
    let current = keyword;
    let depth = 0;

    while (current.parent_id && depth < 6) {
      const parent = keywords.find((k) => k.id === current.parent_id);
      if (!parent) break;
      path.unshift(parent.label);
      current = parent;
      depth += 1;
    }

    return path.join(" → ");
  }

  async function handleCreate() {
    const trimmed = newKeywordLabel.trim();
    if (!trimmed) return;

    setCreating(true);
    setError("");

    try {
      await findOrCreateKeyword(trimmed);
      await loadKeywords();
      setNewKeywordLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create keyword.");
    }

    setCreating(false);
  }

  function renderTree(
    parent: Keyword,
    depth: number
  ): React.ReactNode {
    const children = childrenOf(
      parent.id
    );

    return (
      <div key={parent.id}>
        <div
          className="flex items-center justify-between gap-3 border-b border-zinc-200 py-2"
          style={{
            paddingLeft: depth * 24,
          }}
        >
          <div className="min-w-0 flex-1">
            {editingId === parent.id ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(parent);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleRename(parent)}
                className="w-full rounded-lg border border-brand bg-white px-2 py-1 text-sm text-zinc-900 outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(parent.id);
                  setEditLabel(parent.label);
                }}
                className="block truncate text-left text-sm text-zinc-900 hover:underline"
                title="Click to rename"
              >
                {parent.label}
                {parent.category && (
                  <span className="ml-2 text-xs text-zinc-600">
                    {parent.category}
                  </span>
                )}
                {parent.concept_id && conceptNames[parent.concept_id] && (
                  <span className="ml-2 text-xs text-brand-text">
                    Concept: {conceptNames[parent.concept_id]}
                  </span>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleUsage(parent)}
            className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
          >
            {usageCounts[parent.id] || 0} prompt
            {usageCounts[parent.id] === 1 ? "" : "s"}
          </button>

          <select
            value={
              parent.parent_id || ""
            }
            disabled={
              savingId === parent.id
            }
            onChange={(e) =>
              handleSetParent(
                parent.id,
                e.target.value
              )
            }
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none"
          >
            <option value="">
              (top level)
            </option>
            {keywords
              .filter(
                (k) =>
                  k.id !== parent.id
              )
              .map((k) => (
                <option
                  key={k.id}
                  value={k.id}
                >
                  {k.label}
                </option>
              ))}
          </select>

          <button
            type="button"
            disabled={
              savingId === parent.id
            }
            onClick={() =>
              handleSetPlacement(
                parent.id,
                parent.placement ===
                  "inline"
                  ? "global"
                  : parent.placement ===
                      "global"
                    ? "both"
                    : "inline"
              )
            }
            title="Inline: inserted directly into the sentence (e.g. camera/shot). Global: appears in the 'Global Keywords' box, applied to the whole prompt. Both: usable either way."
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              parent.placement ===
              "inline"
                ? "bg-brand/15 text-brand-text"
                : parent.placement ===
                    "global"
                  ? "bg-zinc-100 text-zinc-600"
                  : "bg-blue-500/15 text-blue-400"
            }`}
          >
            {parent.placement ===
            "inline"
              ? "Inline"
              : parent.placement ===
                  "global"
                ? "Global"
                : "Both"}
          </button>

          <button
            type="button"
            disabled={savingId === parent.id}
            onClick={() => handleDelete(parent)}
            className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        {expandedUsageId === parent.id && (
          <div
            className="border-b border-zinc-100 bg-zinc-50 px-3 py-2"
            style={{ paddingLeft: depth * 24 + 12 }}
          >
            {loadingUsageId === parent.id ? (
              <p className="text-xs text-zinc-500">Loading...</p>
            ) : (usageDetails[parent.id] || []).length === 0 ? (
              <p className="text-xs text-zinc-500">
                Not used by any prompt yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {(usageDetails[parent.id] || []).map((p) => (
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

        {children.map((child) =>
          renderTree(child, depth + 1)
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
          Admin
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Global Keyword Library
        </h1>

        <p className="mt-2 text-zinc-600">
          The single source of truth for keywords across the whole
          site — shared by Prompt Library and Prompt Designer.
          Search, create, rename, or delete any keyword, and see
          exactly how many prompts use it.
        </p>

        <p className="mt-2 text-zinc-600">
          Organize keywords into a tree
          (e.g. Camera → Camera Movement →
          Dolly Shot) by picking a parent
          for each one. Click the badge to
          cycle through where each keyword
          can appear in the Prompt
          Composer:{" "}
          <span className="text-brand-text">
            Inline
          </span>{" "}
          (inserted directly into the
          sentence — camera/shot
          instructions),{" "}
          <span className="text-zinc-600">
            Global
          </span>{" "}
          (shown in the &quot;Global
          Keywords&quot; box, applied to
          the whole prompt — style/mood
          qualities), or{" "}
          <span className="text-blue-400">
            Both
          </span>{" "}
          (usable either way — the default
          for new keywords).
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
          <div className="mt-6 rounded-xl border border-red-900/50 bg-white p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white" />
        )}

        {!loading &&
          !error &&
          keywords.length === 0 && (
            <p className="mt-8 text-center text-zinc-600">
              No keywords yet.
            </p>
          )}

        {!loading && !error && keywords.length > 0 && searchQuery.trim() && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
            {keywords
              .filter((k) =>
                k.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
              )
              .map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-900">
                    {breadcrumbFor(k)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleUsage(k)}
                    className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
                  >
                    {usageCounts[k.id] || 0} prompt
                    {usageCounts[k.id] === 1 ? "" : "s"}
                  </button>
                </div>
              ))}
          </div>
        )}

        {!loading &&
          !error &&
          keywords.length > 0 &&
          !searchQuery.trim() && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              {topLevel.map((keyword) =>
                renderTree(keyword, 0)
              )}
            </div>
          )}
      </div>
    </main>
  );
}
