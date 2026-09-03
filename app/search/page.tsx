import Image from "next/image";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";
import Link from "next/link";

import SearchBar from "@/components/search/SearchBar";
import SearchFilters from "@/components/search/SearchFilters";
import AddKeywordButton from "@/components/prompt/AddKeywordButton";
import SiteSidebarShell from "@/components/community/layout/SiteSidebarShell";

import { getLibraryItems } from "@/lib/supabase/library";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    tool?: string;
    category?: string;
    type?: string;
    selected?: string;
  }>;
};

type LibraryKeyword = {
  id: string;
  label: string;
  description?: string | null;
  category?: string | null;
};

type LibraryItemKeyword = {
  sort_order: number;
  library_keywords: LibraryKeyword | null;
};

type MediaFilter =
  | "all"
  | "video"
  | "image"
  | "text"
  | "audio"
  | "other";

function getAiTools(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (tool: unknown): tool is string =>
        typeof tool === "string" &&
        tool.trim().length > 0
    );
  }

  if (
    typeof value === "string" &&
    value.trim().length > 0
  ) {
    return [value];
  }

  return [];
}

function getKeywords(
  relations: LibraryItemKeyword[]
): string[] {
  return [...relations]
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order
    )
    .map(
      (relation) =>
        relation.library_keywords?.label
    )
    .filter(
      (keyword): keyword is string =>
        typeof keyword === "string" &&
        keyword.trim().length > 0
    );
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const {
    q,
    tool,
    category,
    type,
    selected,
  } = await searchParams;

  const query =
    q?.trim().toLowerCase() || "";

  const selectedTool = tool || "";
  const selectedCategory = category || "";

  const allowedMediaFilters: MediaFilter[] = [
    "all",
    "video",
    "image",
    "text",
    "audio",
    "other",
  ];

  const selectedType: MediaFilter =
    type &&
    allowedMediaFilters.includes(
      type.toLowerCase() as MediaFilter
    )
      ? (type.toLowerCase() as MediaFilter)
      : "all";

  /*
   * Load Library
   */

  const items = await getLibraryItems();

  /*
   * AI Tools
   */

  const tools = Array.from(
    new Set(
      items.flatMap((item) =>
        getAiTools(item.ai_tools)
      )
    )
  ).sort();

  /*
   * Categories
   */

  const categories = Array.from(
    new Set(
      items
        .map((item) => item.category)
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        )
    )
  ).sort();

  /*
   * Search + Filters
   *
   * Search covers:
   * - Prompt title
   * - Category
   * - Description
   * - Full prompt
   * - AI tools
   * - Keywords
   * - Keyword descriptions
   * - Keyword categories
   */

  const results = items.filter((item) => {
    const relations =
      (item.library_item_keywords ||
        []) as LibraryItemKeyword[];

    const keywords =
      getKeywords(relations);

    const keywordDescriptions =
      relations
        .map(
          (relation) =>
            relation.library_keywords
              ?.description
        )
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        );

    const keywordCategories =
      relations
        .map(
          (relation) =>
            relation.library_keywords
              ?.category
        )
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim().length > 0
        );

    const aiTools =
      getAiTools(item.ai_tools);

    const searchableText = [
      item.title,
      item.category,
      item.description,
      item.prompt,
      item.type,
      item.media_type,
      ...aiTools,
      ...keywords,
      ...keywordDescriptions,
      ...keywordCategories,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string"
      )
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      !query ||
      searchableText.includes(query);

    const matchesTool =
      !selectedTool ||
      aiTools.includes(selectedTool);

    const matchesCategory =
      !selectedCategory ||
      item.category === selectedCategory;

    const mediaType =
      typeof item.media_type === "string"
        ? item.media_type
            .trim()
            .toLowerCase()
        : "";

    let matchesType = true;

    if (selectedType !== "all") {
      if (selectedType === "other") {
        matchesType =
          ![
            "video",
            "image",
            "text",
            "audio",
          ].includes(mediaType);
      } else {
        matchesType =
          mediaType === selectedType;
      }
    }

    return (
      matchesQuery &&
      matchesTool &&
      matchesCategory &&
      matchesType
    );
  });

  /*
   * Selected Library Item
   */

  const selectedItem =
    results.find(
      (item) => item.slug === selected
    ) || results[0] || null;

  /*
   * Selected Keywords
   */

  const selectedRelations =
    selectedItem
      ? ((selectedItem.library_item_keywords ||
          []) as LibraryItemKeyword[])
      : [];

  const selectedKeywords =
    getKeywords(selectedRelations);

  /*
   * Selected AI Tools
   */

  const selectedTools: string[] =
    selectedItem
      ? getAiTools(
          selectedItem.ai_tools
        )
      : [];

  /*
   * Build selected item URL
   */

  function getSelectedUrl(
    slug: string
  ): string {
    const params = new URLSearchParams();

    if (q) {
      params.set("q", q);
    }

    if (selectedTool) {
      params.set(
        "tool",
        selectedTool
      );
    }

    if (selectedCategory) {
      params.set(
        "category",
        selectedCategory
      );
    }

    if (selectedType !== "all") {
      params.set(
        "type",
        selectedType
      );
    }

    params.set(
      "selected",
      slug
    );

    return `/search?${params.toString()}`;
  }

  /*
   * Clear Search URL
   *
   * Removes:
   * - q
   * - selected
   *
   * Keeps:
   * - tool
   * - category
   * - type
   */

  function getClearSearchUrl(): string {
    const params = new URLSearchParams();

    if (selectedTool) {
      params.set(
        "tool",
        selectedTool
      );
    }

    if (selectedCategory) {
      params.set(
        "category",
        selectedCategory
      );
    }

    if (selectedType !== "all") {
      params.set(
        "type",
        selectedType
      );
    }

    const queryString =
      params.toString();

    return queryString
      ? `/search?${queryString}`
      : "/search";
  }

  /*
   * Full Details
   */

  const detailsUrl = selectedItem
    ? `/prompt/${selectedItem.slug}`
    : "/search";

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <SiteSidebarShell>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">

        {/* Header */}

        <header className="mb-8">

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">
            AI Cheatbook
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Library
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">
            Browse prompts, concepts and
            techniques from one unified AI library.
          </p>

        </header>

        {/* Search */}

        <div className="mb-5">
          <SearchBar />
        </div>

        {/* Media Filters */}

        <div className="mb-8">
          <SearchFilters
            query={q || ""}
            selectedTool={selectedTool}
            selectedCategory={selectedCategory}
            tools={tools}
            categories={categories}
          />
        </div>

        {/* Library */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          {/* Library Header */}

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">

            <div>

              <h2 className="font-semibold text-zinc-900">
                Library
              </h2>

              <p className="mt-1 text-xs text-zinc-600">
                {results.length}{" "}
                {results.length === 1
                  ? "item"
                  : "items"}
              </p>

            </div>

            <div className="flex items-center gap-2">

              {query && (
                <div className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 sm:block">
                  Search: &quot;{q}&quot;
                </div>
              )}

              {query && (
                <Link
                  href={getClearSearchUrl()}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand hover:text-brand-text"
                >
                  Clear Search
                </Link>
              )}

            </div>

          </div>

          {/* Main Library Layout */}

          <div className="grid min-h-150 lg:grid-cols-[340px_1fr]">

            {/* Left Library */}

            <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">

              {results.length > 0 ? (

                <div className="max-h-175 overflow-y-auto">

                  {results.map((item) => {

                    const isSelected =
                      selectedItem?.id ===
                      item.id;

                    const itemTools =
                      getAiTools(
                        item.ai_tools
                      );

                    return (
                      <Link
                        key={item.id}
                        href={getSelectedUrl(
                          item.slug
                        )}
                        className={`group block border-b border-zinc-900 px-5 py-4 transition ${
                          isSelected
                            ? "border-l-2 border-l-brand bg-brand/10"
                            : "border-l-2 border-l-transparent hover:bg-white"
                        }`}
                      >

                        <div className="flex gap-4">

                          {/* Thumbnail */}

                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">

                            {item.media_url ? (

                              <Image
                                src={resolveThumbnailUrl(
                                  item.thumbnail_url,
                                  item.media_url,
                                  item.media_source
                                )}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized
                              />

                            ) : (

                              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                                AI
                              </div>

                            )}

                          </div>

                          {/* Item Info */}

                          <div className="min-w-0">

                            <h3
                              className={`truncate text-sm font-semibold transition ${
                                isSelected
                                  ? "text-brand-text"
                                  : "text-zinc-700 group-hover:text-zinc-900"
                              }`}
                            >
                              {item.title}
                            </h3>

                            <p className="mt-1 truncate text-xs text-zinc-600">
                              {item.category ||
                                "AI Prompt"}
                            </p>

                            {itemTools[0] && (
                              <p className="mt-1 truncate text-[11px] text-zinc-600">
                                {itemTools[0]}
                              </p>
                            )}

                          </div>

                        </div>

                      </Link>
                    );
                  })}

                </div>

              ) : (

                /* No Results */

                <div className="flex min-h-100 items-center justify-center px-6 text-center">

                  <div className="max-w-xs">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-xl">
                      🔍
                    </div>

                    <p className="mt-4 text-sm font-semibold text-zinc-700">
                      No results found
                    </p>

                    {query ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        We couldn&apos;t find anything
                        matching{" "}
                        <span className="text-zinc-600">
                          &quot;{q}&quot;
                        </span>
                        .
                      </p>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        No library items match
                        your current filters.
                      </p>
                    )}

                    {query && (
                      <Link
                        href={getClearSearchUrl()}
                        className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-brand-dark"
                      >
                        Clear Search
                      </Link>
                    )}

                  </div>

                </div>

              )}

            </aside>

            {/* Right Detail */}

            <div className="min-w-0">

              {selectedItem ? (

                <div className="p-6 sm:p-8">

                  {/* Detail Header */}

                  <div className="flex flex-col gap-6 sm:flex-row">

                    {/* Image */}

                    {selectedItem.media_url && (

                      <div className="relative aspect-4/5 w-full shrink-0 overflow-hidden rounded-xl bg-white sm:w-44">

                        <Image
                          src={resolveThumbnailUrl(
                            selectedItem.thumbnail_url,
                            selectedItem.media_url,
                            selectedItem.media_source
                          )}
                          alt={
                            selectedItem.title
                          }
                          fill
                          sizes="176px"
                          className="object-cover"
                          unoptimized
                        />

                      </div>

                    )}

                    {/* Title + Description */}

                    <div className="min-w-0">

                      <div className="flex flex-wrap gap-2">

                        {selectedItem.category && (
                          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-text">
                            {
                              selectedItem.category
                            }
                          </span>
                        )}

                        {selectedItem.type && (
                          <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
                            {
                              selectedItem.type
                            }
                          </span>
                        )}

                      </div>

                      <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                        {selectedItem.title}
                      </h2>

                      {selectedItem.description && (
                        <p className="mt-3 text-sm leading-6 text-zinc-600">
                          {
                            selectedItem.description
                          }
                        </p>
                      )}

                    </div>

                  </div>

                  {/* Prompt */}

                  {selectedItem.prompt && (

                    <div className="mt-8">

                      <div className="mb-3 flex items-center justify-between">

                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          Prompt
                        </p>

                        <span className="text-xs text-zinc-600">
                          Ready to use
                        </span>

                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-5">

                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap wrap-break-word font-mono text-sm leading-6 text-zinc-600">
                          {
                            selectedItem.prompt
                          }
                        </pre>

                      </div>

                    </div>

                  )}

                  {/* Keywords */}

                  {selectedKeywords.length > 0 && (

                    <div className="mt-8">

                      <div className="mb-3 flex items-center justify-between gap-4">

                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          Keywords
                        </p>

                        <span className="text-[11px] text-zinc-600">
                          Add to Generator
                        </span>

                      </div>

                      <div className="flex flex-wrap gap-2">

                        {selectedKeywords.map(
                          (keyword: string) => (

                            <div
                              key={keyword}
                              className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white pl-3 pr-1"
                            >

                              <Link
                                href={`/search?q=${encodeURIComponent(
                                  keyword
                                )}`}
                                className="py-1.5 text-xs text-zinc-600 transition hover:text-brand-text"
                              >
                                {keyword}
                              </Link>

                              <AddKeywordButton
                                keyword={keyword}
                              />

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}

                  {/* Works With */}

                  {selectedTools.length > 0 && (

                    <div className="mt-7">

                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Works With
                      </p>

                      <div className="flex flex-wrap gap-2">

                        {selectedTools.map(
                          (tool: string) => (

                            <Link
                              key={tool}
                              href={`/search?tool=${encodeURIComponent(
                                tool
                              )}`}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition hover:border-brand hover:text-brand-text"
                            >
                              {tool}
                            </Link>

                          )
                        )}

                      </div>

                    </div>

                  )}

                  {/* Created By */}

                  <div className="mt-8 border-t border-zinc-200 pt-6">

                    <p className="text-xs text-zinc-600">
                      Created by
                    </p>

                    <p className="mt-1 text-sm text-zinc-600">
                      AI Cheatbook
                    </p>

                  </div>

                  {/* Actions */}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                    <Link
                      href={detailsUrl}
                      className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
                    >
                      Open Full Details →
                    </Link>

                    <Link
                      href={detailsUrl}
                      className="rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-semibold text-zinc-600 transition hover:border-brand hover:text-brand-text"
                    >
                      View Prompt
                    </Link>

                  </div>

                </div>

              ) : (

                /* Empty Detail State */

                <div className="flex min-h-150 items-center justify-center px-8 text-center">

                  <div className="max-w-md">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-2xl">
                      ✨
                    </div>

                    <h2 className="mt-5 text-xl font-semibold text-zinc-900">
                      Explore the AI Library
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                      Search for a prompt,
                      concept, keyword or AI
                      tool to explore the library.
                    </p>

                    {query && results.length === 0 && (
                      <Link
                        href={getClearSearchUrl()}
                        className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
                      >
                        Clear Search
                      </Link>
                    )}

                  </div>

                </div>

              )}

            </div>

          </div>

        </section>

      </div>

      </SiteSidebarShell>
    </main>
  );
}