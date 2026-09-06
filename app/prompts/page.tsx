"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

type Category = { id: string; name: string; slug: string };
type Subcategory = { id: string; category_id: string; name: string; slug: string };
type Concept = { id: string; subcategory_id: string; name: string; slug: string };
type Keyword = { id: string; label: string };

type PromptSummary = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  media_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
};

function BrowseLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptCounts, setConceptCounts] = useState<Record<string, number>>(
    {}
  );

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categorySlug = searchParams.get("category") || "";
  const subcategorySlug = searchParams.get("subcategory") || "";
  const conceptSlug = searchParams.get("concept") || "";
  const keywordId = searchParams.get("keyword") || "";

  const selectedCategory = categories.find((c) => c.slug === categorySlug);
  const selectedSubcategory = subcategories.find(
    (s) => s.slug === subcategorySlug && s.category_id === selectedCategory?.id
  );
  const selectedConcept = concepts.find(
    (c) =>
      c.slug === conceptSlug && c.subcategory_id === selectedSubcategory?.id
  );

  function updateUrl(next: {
    category?: string;
    subcategory?: string;
    concept?: string;
    keyword?: string;
  }) {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.subcategory) params.set("subcategory", next.subcategory);
    if (next.concept) params.set("concept", next.concept);
    if (next.keyword) params.set("keyword", next.keyword);

    const query = params.toString();
    router.push(`/prompts${query ? `?${query}` : ""}`, { scroll: false });
  }

  /*
   * Taxonomy tree + rough per-concept counts, loaded once. The
   * counts come from a single lightweight query (just the
   * concept_id column of every published prompt) rather than a
   * separate count query per dropdown option — cheap even as the
   * library grows into the thousands, per the spec's efficiency
   * requirement.
   */
  useEffect(() => {
    async function load() {
      const [catsRes, subsRes, conceptsRes, itemsRes] = await Promise.all([
        supabase
          .from("prompt_categories")
          .select("id, name, slug")
          .order("sort_order", { ascending: true }),
        supabase
          .from("prompt_subcategories")
          .select("id, category_id, name, slug")
          .order("sort_order", { ascending: true }),
        supabase
          .from("prompt_concepts")
          .select("id, subcategory_id, name, slug")
          .order("sort_order", { ascending: true }),
        supabase
          .from("library_items")
          .select("concept_id")
          .eq("is_published", true)
          .not("concept_id", "is", null),
      ]);

      setCategories(catsRes.data || []);
      setSubcategories(subsRes.data || []);
      setConcepts(conceptsRes.data || []);

      const counts: Record<string, number> = {};
      for (const row of itemsRes.data || []) {
        if (row.concept_id) {
          counts[row.concept_id] = (counts[row.concept_id] || 0) + 1;
        }
      }
      setConceptCounts(counts);
      setLoadingTaxonomy(false);
    }

    load();
  }, []);

  // Keywords for the selected Concept — fetched lazily, only once
  // a Concept is actually chosen.
  useEffect(() => {
    async function load() {
      if (!selectedConcept) {
        setKeywords([]);
        return;
      }

      setLoadingKeywords(true);

      const { data } = await supabase
        .from("library_keywords")
        .select("id, label")
        .eq("concept_id", selectedConcept.id)
        .order("label", { ascending: true });

      setKeywords(data || []);
      setLoadingKeywords(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConcept?.id]);

  // The actual filtered prompt list — the query shape changes
  // depending on which level is selected, per the spec's exact
  // "filter at every level, not just the deepest one" requirement.
  useEffect(() => {
    async function load() {
      setLoadingPrompts(true);

      let query = supabase
        .from("library_items")
        .select("id, title, slug, category, media_url, media_source, thumbnail_url")
        .eq("is_published", true);

      if (keywordId) {
        const { data: linkRows } = await supabase
          .from("library_item_keywords")
          .select("library_item_id")
          .eq("keyword_id", keywordId);

        const ids = (linkRows || []).map((r) => r.library_item_id);
        if (ids.length === 0) {
          setPrompts([]);
          setLoadingPrompts(false);
          return;
        }
        query = query.in("id", ids);
      } else if (selectedConcept) {
        query = query.eq("concept_id", selectedConcept.id);
      } else if (selectedSubcategory) {
        const conceptIds = concepts
          .filter((c) => c.subcategory_id === selectedSubcategory.id)
          .map((c) => c.id);
        if (conceptIds.length === 0) {
          setPrompts([]);
          setLoadingPrompts(false);
          return;
        }
        query = query.in("concept_id", conceptIds);
      } else if (selectedCategory) {
        const subcatIds = subcategories
          .filter((s) => s.category_id === selectedCategory.id)
          .map((s) => s.id);
        const conceptIds = concepts
          .filter((c) => subcatIds.includes(c.subcategory_id))
          .map((c) => c.id);
        if (conceptIds.length === 0) {
          setPrompts([]);
          setLoadingPrompts(false);
          return;
        }
        query = query.in("concept_id", conceptIds);
      }

      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        const term = `%${trimmedSearch}%`;
        query = query.or(
          `title.ilike.${term},description.ilike.${term},prompt.ilike.${term}`
        );
      }

      /*
       * No .limit() here on purpose — matching the existing
       * /search page's behavior (which also fetches everything
       * matching, no pagination) rather than cycling through
       * pages. Every matching prompt shows on this one page.
       */
      const { data, error } = await query.order("published_at", {
        ascending: false,
      });

      if (error) {
        console.error("BrowseLibrary: failed to load prompts:", error.message);
      }

      setPrompts(data || []);
      setLoadingPrompts(false);
    }

    let cancelled = false;

    async function runLoad() {
      if (!cancelled) await load();
    }

    if (!loadingTaxonomy) {
      const timeout = setTimeout(runLoad, searchQuery ? 300 : 0);
      return () => {
        cancelled = true;
        clearTimeout(timeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadingTaxonomy,
    selectedCategory?.id,
    selectedSubcategory?.id,
    selectedConcept?.id,
    keywordId,
    searchQuery,
  ]);

  const visibleSubcategories = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory.id)
    : [];
  const visibleConcepts = selectedSubcategory
    ? concepts.filter((c) => c.subcategory_id === selectedSubcategory.id)
    : [];

  function categoryCount(categoryId: string): number {
    const subcatIds = subcategories
      .filter((s) => s.category_id === categoryId)
      .map((s) => s.id);
    const conceptIds = concepts
      .filter((c) => subcatIds.includes(c.subcategory_id))
      .map((c) => c.id);
    return conceptIds.reduce((sum, id) => sum + (conceptCounts[id] || 0), 0);
  }

  function subcategoryCount(subcategoryId: string): number {
    const conceptIds = concepts
      .filter((c) => c.subcategory_id === subcategoryId)
      .map((c) => c.id);
    return conceptIds.reduce((sum, id) => sum + (conceptCounts[id] || 0), 0);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
          Browse Library
        </p>
        <h1 className="mt-1 text-3xl font-bold">Prompt Library</h1>

        {/* Breadcrumb */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => updateUrl({})}
            className={
              !selectedCategory
                ? "font-semibold text-brand-text"
                : "text-zinc-500 hover:text-zinc-900"
            }
          >
            All Prompts
          </button>
          {selectedCategory && (
            <>
              <span className="text-zinc-300">/</span>
              <button
                type="button"
                onClick={() => updateUrl({ category: selectedCategory.slug })}
                className={
                  !selectedSubcategory
                    ? "font-semibold text-brand-text"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              >
                {selectedCategory.name}
              </button>
            </>
          )}
          {selectedSubcategory && (
            <>
              <span className="text-zinc-300">/</span>
              <button
                type="button"
                onClick={() =>
                  updateUrl({
                    category: selectedCategory?.slug,
                    subcategory: selectedSubcategory.slug,
                  })
                }
                className={
                  !selectedConcept
                    ? "font-semibold text-brand-text"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              >
                {selectedSubcategory.name}
              </button>
            </>
          )}
          {selectedConcept && (
            <>
              <span className="text-zinc-300">/</span>
              <button
                type="button"
                onClick={() =>
                  updateUrl({
                    category: selectedCategory?.slug,
                    subcategory: selectedSubcategory?.slug,
                    concept: selectedConcept.slug,
                  })
                }
                className={
                  !keywordId
                    ? "font-semibold text-brand-text"
                    : "text-zinc-500 hover:text-zinc-900"
                }
              >
                {selectedConcept.name}
              </button>
            </>
          )}
          {keywordId && (
            <>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold text-brand-text">
                {keywords.find((k) => k.id === keywordId)?.label || "Keyword"}
              </span>
            </>
          )}
        </div>

        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search the Prompt Library..."
          className="mt-6 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand"
        />

        {/* Cascading selectors */}
        {loadingTaxonomy ? (
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-zinc-100" />
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select
              value={selectedCategory?.slug || ""}
              onChange={(e) => updateUrl({ category: e.target.value })}
              className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({categoryCount(c.id)})
                </option>
              ))}
            </select>

            <select
              value={selectedSubcategory?.slug || ""}
              disabled={!selectedCategory}
              onChange={(e) =>
                updateUrl({
                  category: selectedCategory?.slug,
                  subcategory: e.target.value,
                })
              }
              className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">
                {selectedCategory ? "All Subcategories" : "Select a category first"}
              </option>
              {visibleSubcategories.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name} ({subcategoryCount(s.id)})
                </option>
              ))}
            </select>

            <select
              value={selectedConcept?.slug || ""}
              disabled={!selectedSubcategory}
              onChange={(e) =>
                updateUrl({
                  category: selectedCategory?.slug,
                  subcategory: selectedSubcategory?.slug,
                  concept: e.target.value,
                })
              }
              className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">
                {selectedSubcategory ? "All Concepts" : "Select a subcategory first"}
              </option>
              {visibleConcepts.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({conceptCounts[c.id] || 0})
                </option>
              ))}
            </select>

            <select
              value={keywordId}
              disabled={!selectedConcept || loadingKeywords}
              onChange={(e) =>
                updateUrl({
                  category: selectedCategory?.slug,
                  subcategory: selectedSubcategory?.slug,
                  concept: selectedConcept?.slug,
                  keyword: e.target.value,
                })
              }
              className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-40"
            >
              <option value="">
                {!selectedConcept
                  ? "Select a concept first"
                  : loadingKeywords
                    ? "Loading..."
                    : "All Keywords"}
              </option>
              {keywords.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Results */}
        <div className="mt-8">
          {loadingPrompts ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-100"
                />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-600">
              {selectedConcept || keywordId
                ? "No prompts available for this concept yet."
                : "No prompts found."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {prompts.map((p) => (
                <Link
                  key={p.id}
                  href={`/prompt/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-zinc-200 transition hover:border-brand/50 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] bg-zinc-100">
                    <Image
                      src={resolveThumbnailUrl(
                        p.thumbnail_url,
                        p.media_url,
                        p.media_source
                      )}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-brand-text">
                      {p.title}
                    </p>
                    {p.category && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {p.category}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function BrowseLibraryPage() {
  return (
    <Suspense fallback={null}>
      <BrowseLibrary />
    </Suspense>
  );
}
