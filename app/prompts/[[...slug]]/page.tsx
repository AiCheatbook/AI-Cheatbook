"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Bookmark, Share2, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";
import RichContentRenderer from "@/components/cms/RichContentRenderer";
import RelatedContentSection from "@/components/cms/RelatedContentSection";
import CustomFieldsPublicZone from "@/components/cms/CustomFieldsPublicZone";
import CommentSection from "@/components/comments/CommentSection";
import RatingSection from "@/components/prompt/RatingSection";
import AddKeywordButton from "@/components/prompt/AddKeywordButton";
import type { RelatedContentItem } from "@/lib/cms/relatedContent";
import type { CustomField } from "@/lib/cms/customFields";

type PromptResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  prompt: string | null;
  ai_tools: string[] | null;
  media_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  concept_id: string | null;
  concept_name: string | null;
  published_at: string | null;
  description_html?: string | null;
  related_content?: RelatedContentItem[];
  custom_fields?: CustomField[];
};

type Category = { id: string; name: string; slug: string };
type Subcategory = { id: string; category_id: string; name: string; slug: string };
type Concept = { id: string; subcategory_id: string; name: string; slug: string };
type Keyword = { id: string; label: string };

type SortOption = "newest" | "title";

export default function PromptLibraryPage() {
  const params = useParams();
  const initialSlug = Array.isArray(params.slug) ? params.slug[0] : undefined;

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [taxonomyLoaded, setTaxonomyLoaded] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const [results, setResults] = useState<PromptResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  const [selected, setSelected] = useState<PromptResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [copied, setCopied] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSlugHandled = useRef(false);

  // Load the taxonomy tree once, for the filter dropdowns.
  useEffect(() => {
    async function load() {
      const [catsRes, subsRes, conceptsRes] = await Promise.all([
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
      ]);

      setCategories(catsRes.data || []);
      setSubcategories(subsRes.data || []);
      setConcepts(conceptsRes.data || []);
      setTaxonomyLoaded(true);
    }

    load();
  }, []);

  // Debounced search — fires 250ms after the user stops typing,
  // or immediately when a filter changes. Runs entirely against
  // the search_prompts() database function, never against a
  // client-side copy of the whole library.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(
      () => {
        void runSearch();
      },
      searchInput ? 250 : 0
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, categoryId, subcategoryId, conceptId]);

  async function runSearch() {
    setLoadingResults(true);

    const { data, error } = await supabase.rpc("search_prompts", {
      search_query: searchInput.trim() || null,
      filter_category_id: categoryId || null,
      filter_subcategory_id: subcategoryId || null,
      filter_concept_id: conceptId || null,
      result_limit: 60,
    });

    if (error) {
      console.error("Prompt search failed:", error.message);
      setResults([]);
      setLoadingResults(false);
      return;
    }

    setResults((data || []) as PromptResult[]);
    setLoadingResults(false);
  }

  // Once results are in for the first time, honor a deep-linked
  // slug from the URL by selecting that prompt.
  useEffect(() => {
    if (initialSlugHandled.current || loadingResults) return;
    initialSlugHandled.current = true;

    if (!initialSlug) return;

    const match = results.find((r) => r.slug === initialSlug);
    if (match) {
      selectPrompt(match, { updateUrl: false });
    } else {
      loadPromptBySlug(initialSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingResults]);

  // Back/forward browser navigation.
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;
      const slug = path.replace(/^\/prompts\/?/, "");

      if (!slug) {
        setSelected(null);
        return;
      }

      const match = results.find((r) => r.slug === slug);
      if (match) {
        selectPrompt(match, { updateUrl: false });
      } else {
        loadPromptBySlug(slug);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  async function loadPromptBySlug(slug: string) {
    const { data } = await supabase
      .from("library_items")
      .select(
        `
        id, title, slug, description, prompt, ai_tools,
        media_url, media_source, thumbnail_url,
        concept_id,
        prompt_concepts (
          id, name, subcategory_id,
          prompt_subcategories (
            id, name, category_id,
            prompt_categories ( id, name )
          )
        )
      `
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!data) return;

    type ConceptJoin = {
      id: string;
      name: string;
      subcategory_id: string;
      prompt_subcategories?: {
        id: string;
        name: string;
        category_id: string;
        prompt_categories?: { id: string; name: string } | null;
      } | null;
    };

    const conceptJoin = data.prompt_concepts as unknown as ConceptJoin | null;
    const subJoin = conceptJoin?.prompt_subcategories;
    const catJoin = subJoin?.prompt_categories;

    selectPrompt(
      {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        prompt: data.prompt,
        ai_tools: data.ai_tools,
        media_url: data.media_url,
        media_source: data.media_source,
        thumbnail_url: data.thumbnail_url,
        category_id: catJoin?.id || null,
        category_name: catJoin?.name || null,
        subcategory_id: subJoin?.id || null,
        subcategory_name: subJoin?.name || null,
        concept_id: conceptJoin?.id || null,
        concept_name: conceptJoin?.name || null,
        published_at: null,
      },
      { updateUrl: false }
    );
  }

  async function selectPrompt(
    prompt: PromptResult,
    options: { updateUrl?: boolean } = { updateUrl: true }
  ) {
    setSelected(prompt);
    setCopied(false);

    if (options.updateUrl !== false) {
      window.history.pushState(null, "", `/prompts/${prompt.slug}`);
    }

    const [keywordsRes, detailRes] = await Promise.all([
      supabase
        .from("library_item_keywords")
        .select("library_keywords ( id, label )")
        .eq("library_item_id", prompt.id),
      supabase
        .from("library_items")
        .select("description_html, related_content, custom_fields")
        .eq("id", prompt.id)
        .single(),
    ]);

    const keywords = (keywordsRes.data || [])
      .map((row) => row.library_keywords as unknown as Keyword | null)
      .filter((k): k is Keyword => Boolean(k));

    setSelectedKeywords(keywords);

    if (detailRes.data) {
      setSelected((prev) =>
        prev && prev.id === prompt.id
          ? {
              ...prev,
              description_html: detailRes.data.description_html,
              related_content: detailRes.data.related_content || [],
              custom_fields: detailRes.data.custom_fields || [],
            }
          : prev
      );
    }
  }

  function handleCopy() {
    if (!selected?.prompt) return;
    navigator.clipboard.writeText(selected.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const visibleSubcategories = categoryId
    ? subcategories.filter((s) => s.category_id === categoryId)
    : [];
  const visibleConcepts = subcategoryId
    ? concepts.filter((c) => c.subcategory_id === subcategoryId)
    : [];

  const sortedResults = [...results].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    return (
      new Date(b.published_at || 0).getTime() -
      new Date(a.published_at || 0).getTime()
    );
  });

  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col bg-white text-zinc-900">
      {/* Top bar: search + filters */}
      <div className="shrink-0 border-b border-zinc-200 px-6 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search prompts, categories, concepts..."
            className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={categoryId}
            disabled={!taxonomyLoaded}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
              setConceptId("");
            }}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand disabled:opacity-40"
          >
            <option value="">Category</option>
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
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand disabled:opacity-40"
          >
            <option value="">Sub-category</option>
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
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand disabled:opacity-40"
          >
            <option value="">Concept</option>
            {visibleConcepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="ml-auto rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:border-brand"
          >
            <option value="newest">Newest</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* Two-pane body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT — results list */}
        <div className="flex w-full shrink-0 flex-col border-r border-zinc-200 sm:w-80">
          <p className="shrink-0 px-4 py-2 text-xs text-zinc-500">
            {loadingResults
              ? "Searching..."
              : searchInput.trim()
                ? `${results.length} matching prompt${results.length === 1 ? "" : "s"}`
                : `${results.length} prompt${results.length === 1 ? "" : "s"}`}
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!loadingResults && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-zinc-700">
                  No prompts found
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Try a different keyword or remove some filters.
                </p>
              </div>
            )}

            {sortedResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectPrompt(r)}
                className={`block w-full border-b border-zinc-100 px-4 py-3 text-left transition ${
                  selected?.id === r.id
                    ? "bg-brand/10"
                    : "hover:bg-zinc-50"
                }`}
              >
                <p
                  className={`truncate text-sm font-medium ${
                    selected?.id === r.id ? "text-brand-text" : "text-zinc-900"
                  }`}
                >
                  {r.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {[r.category_name, r.concept_name ? "Prompt" : null]
                    .filter(Boolean)
                    .join(" · ") || "Prompt"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — inspector */}
        <div className="hidden min-h-0 flex-1 overflow-y-auto sm:block">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-lg font-semibold text-zinc-900">
                Select a prompt
              </p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Browse the library to explore verified prompts and concepts.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl px-8 py-8">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs text-zinc-500">
                  {[selected.category_name, selected.subcategory_name, selected.concept_name]
                    .filter(Boolean)
                    .join(" > ")}
                </p>
                <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-600">
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-brand-text"
                  >
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/prompts/${selected.slug}`
                      );
                    }}
                    className="flex items-center gap-1 hover:text-brand-text"
                  >
                    <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Share
                  </button>
                </div>
              </div>

              <CustomFieldsPublicZone fields={selected.custom_fields || []} zone="above_title" />

              <h1 className="mt-2 text-2xl font-bold text-zinc-900">
                {selected.title}
              </h1>

              <CustomFieldsPublicZone fields={selected.custom_fields || []} zone="below_title" />

              {selected.description && (
                <p className="mt-1.5 text-sm text-zinc-600">
                  {selected.description}
                </p>
              )}

              <CustomFieldsPublicZone fields={selected.custom_fields || []} zone="below_description" />

              {selected.description_html && (
                <div className="mt-4">
                  <RichContentRenderer html={selected.description_html} />
                </div>
              )}

              {selected.media_url && (
                <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={resolveThumbnailUrl(
                      selected.thumbnail_url,
                      selected.media_url,
                      selected.media_source
                    )}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {selected.prompt && (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">
                      Prompt
                    </p>
                  </div>
                  <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700">
                    {selected.prompt}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
              )}

              <CustomFieldsPublicZone fields={selected.custom_fields || []} zone="below_prompt" />

              {selectedKeywords.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-zinc-900">
                    Keywords
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Click the + button to add keywords directly to the Prompt Builder.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedKeywords.map((k) => (
                      <span
                        key={k.id}
                        className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white pl-4 pr-1 py-1 text-sm text-zinc-600"
                      >
                        <span>{k.label}</span>
                        <AddKeywordButton keyword={k.label} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.ai_tools && selected.ai_tools.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-zinc-900">
                    Works With
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.ai_tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <CustomFieldsPublicZone fields={selected.custom_fields || []} zone="bottom" />

              <RelatedContentSection items={selected.related_content || []} />

              <RatingSection libraryItemId={selected.id} />

              <CommentSection contentType="prompt" contentId={selected.id} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
