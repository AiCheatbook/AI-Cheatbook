"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

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

type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  type?: string | null;
  category?: string | null;
  description?: string | null;
  prompt?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  media_source?: string | null;
  thumbnail_url?: string | null;
  ai_tools?: string[] | null;
  author_name?: string | null;
  rating?: number | null;
  reviews?: number | null;
  review_count?: number | null;
  sort_order?: number | null;
  library_item_keywords?: LibraryItemKeyword[];
};

type FilterType =
  | "All"
  | "Video"
  | "Image"
  | "Text"
  | "Audio"
  | "Other";

const FILTERS: FilterType[] = [
  "All",
  "Video",
  "Image",
  "Text",
  "Audio",
  "Other",
];

/* --------------------------------
   AI Tools
--------------------------------- */

function getAiTools(
  item: LibraryItem
): string[] {
  if (Array.isArray(item.ai_tools)) {
    return item.ai_tools.filter(
      (tool): tool is string =>
        typeof tool === "string" &&
        tool.trim().length > 0
    );
  }

  return [];
}

/* --------------------------------
   Keywords
--------------------------------- */

function getKeywords(
  item: LibraryItem
): string[] {
  return (item.library_item_keywords || [])
    .slice()
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order
    )
    .map(
      (itemKeyword) =>
        itemKeyword.library_keywords?.label
    )
    .filter(
      (keyword): keyword is string =>
        Boolean(keyword)
    );
}

/* --------------------------------
   Content Type

   IMPORTANT:
   Supabase structure:
   type     = concept
   category = video / image / text
--------------------------------- */

function getContentType(
  item: LibraryItem
): FilterType {
  const value = (
    item.category || ""
  )
    .toString()
    .trim()
    .toLowerCase();

  if (value.includes("video")) {
    return "Video";
  }

  if (value.includes("image")) {
    return "Image";
  }

  if (value.includes("text")) {
    return "Text";
  }

  if (value.includes("audio")) {
    return "Audio";
  }

  return "Other";
}

/* --------------------------------
   Main Component
--------------------------------- */

export default function PromptGrid() {
  const [items, setItems] = useState<
    LibraryItem[]
  >([]);

  const [selectedItem, setSelectedItem] =
    useState<LibraryItem | null>(null);

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<FilterType>("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* --------------------------------
     Load Library
  --------------------------------- */

  useEffect(() => {
    async function loadLibrary() {
      try {
        setLoading(true);
        setError("");

        const { data, error } =
          await supabase
            .from("library_items")
            .select(`
              *,
              library_item_keywords (
                sort_order,
                library_keywords (
                  id,
                  label,
                  description,
                  category
                )
              )
            `)
            .order("sort_order", {
              ascending: true,
            });

        if (error) {
          throw new Error(
            error.message
          );
        }

        const libraryItems =
          (data || []) as LibraryItem[];

        setItems(libraryItems);

        if (libraryItems.length > 0) {
          setSelectedItem(
            libraryItems[0]
          );
        }
      } catch (err) {
        console.error(
          "Failed to load library:",
          err
        );

        setError(
          "Unable to load the library."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  /* --------------------------------
     Search + Filter
  --------------------------------- */

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return items.filter((item) => {
      const keywords =
        getKeywords(item);

      const aiTools =
        getAiTools(item);

      const contentType =
        getContentType(item);

      const searchableText = [
        item.title,
        item.type,
        item.category,
        item.description,
        item.prompt,
        item.author_name,
        contentType,
        ...aiTools,
        ...keywords,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      const matchesFilter =
        activeFilter === "All" ||
        contentType === activeFilter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    items,
    search,
    activeFilter,
  ]);

  /* --------------------------------
     Select Item
  --------------------------------- */

  function selectItem(
    item: LibraryItem
  ) {
    setSelectedItem(item);
  }

  /* --------------------------------
     UI
  --------------------------------- */

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">

      {/* Header */}

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
          Explore the Library
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          AI Cheatbook Library
        </h2>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Browse prompts, concepts and
          techniques from one unified
          AI library.
        </p>
      </div>

      {/* Search */}

      <div className="mb-6">
        <div className="relative">

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search prompts, concepts, keywords..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 pl-12 text-white outline-none transition placeholder:text-zinc-500 focus:border-orange-500"
          />

          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500">
            🔍
          </span>

        </div>
      </div>

      {/* Filters */}

      <div className="mb-8 flex flex-wrap gap-2">

        {FILTERS.map((filter) => {
          const active =
            activeFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() =>
                setActiveFilter(
                  filter
                )
              }
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              {filter}
            </button>
          );
        })}

      </div>

      {/* Loading */}

      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-zinc-400">
            Loading library...
          </p>
        </div>
      )}

      {/* Error */}

      {!loading && error && (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Library */}

      {!loading &&
        !error &&
        items.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">

            {/* LEFT — Library List */}

            <aside className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">

              {/* Sidebar Header */}

              <div className="border-b border-zinc-800 px-5 py-4">

                <div className="flex items-center justify-between">

                  <h3 className="font-semibold text-white">
                    Library
                  </h3>

                  <span className="text-xs text-zinc-500">
                    {filteredItems.length}
                  </span>

                </div>

              </div>

              {/* Items */}

              <div className="max-h-175 overflow-y-auto">

                {filteredItems.length >
                0 ? (
                  filteredItems.map(
                    (item) => {
                      const active =
                        selectedItem?.id ===
                        item.id;

                      const contentType =
                        getContentType(
                          item
                        );

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            selectItem(
                              item
                            )
                          }
                          className={`w-full border-b border-zinc-800 px-5 py-4 text-left transition ${
                            active
                              ? "bg-orange-500/10"
                              : "hover:bg-zinc-800/60"
                          }`}
                        >

                          <div className="flex items-start gap-3">

                            <div
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                active
                                  ? "bg-orange-500"
                                  : "bg-zinc-700"
                              }`}
                            />

                            <div className="min-w-0">

                              <p
                                className={`truncate font-medium ${
                                  active
                                    ? "text-orange-400"
                                    : "text-white"
                                }`}
                              >
                                {item.title}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {item.type ||
                                  "Content"}
                                {" • "}
                                {contentType}
                              </p>

                            </div>

                          </div>

                        </button>
                      );
                    }
                  )
                ) : (
                  <div className="p-8 text-center">

                    <p className="text-sm text-zinc-500">
                      No library items
                      found.
                    </p>

                  </div>
                )}

              </div>

            </aside>

            {/* RIGHT — Detail */}

            <div className="min-w-0">

              {selectedItem ? (
                <LibraryDetail
                  item={
                    selectedItem
                  }
                />
              ) : (
                <div className="flexmin-h-125 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">

                  <p className="text-zinc-500">
                    Select an item from
                    the library.
                  </p>

                </div>
              )}

            </div>

          </div>
        )}

      {/* Empty Database */}

      {!loading &&
        !error &&
        items.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">

            <p className="text-zinc-400">
              No library items
              available yet.
            </p>

          </div>
        )}

    </section>
  );
}

/* --------------------------------
   Library Detail
--------------------------------- */

function LibraryDetail({
  item,
}: {
  item: LibraryItem;
}) {
  const keywords =
    getKeywords(item);

  const aiTools =
    getAiTools(item);

  const contentType =
    getContentType(item);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">

      {/* Thumbnail (always 4:5) */}

      {(item.thumbnail_url || item.media_url) && (
        <div className="relative aspect-[4/5] overflow-hidden bg-black">

          <Image
            src={resolveThumbnailUrl(
              item.thumbnail_url,
              item.media_url,
              item.media_source
            )}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />

        </div>
      )}

      {/* Content */}

      <div className="p-6 sm:p-8">

        {/* Type + Category */}

        <div className="flex flex-wrap gap-2">

          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
            {item.type ||
              "Content"}
          </span>

          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
            {contentType}
          </span>

        </div>

        {/* Title */}

        <h3 className="mt-5 text-3xl font-bold text-white">
          {item.title}
        </h3>

        {/* Description */}

        {item.description && (
          <p className="mt-4 leading-7 text-zinc-400">
            {item.description}
          </p>
        )}

        {/* Prompt */}

        {item.prompt && (
          <div className="mt-7">

            <div className="mb-3 flex items-center justify-between">

              <h4 className="font-semibold text-white">
                Prompt
              </h4>

              <span className="text-xs text-zinc-500">
                Ready to use
              </span>

            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-5">

              <p className="whitespace-pre-line leading-7 text-zinc-300">
                {item.prompt}
              </p>

            </div>

          </div>
        )}

        {/* Keywords */}

        {keywords.length > 0 && (
          <div className="mt-7">

            <h4 className="mb-3 font-semibold text-white">
              Keywords
            </h4>

            <div className="flex flex-wrap gap-2">

              {keywords.map(
                (keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300"
                  >
                    {keyword}
                  </span>
                )
              )}

            </div>

          </div>
        )}

        {/* AI Tools */}

        {aiTools.length > 0 && (
          <div className="mt-7">

            <h4 className="mb-3 font-semibold text-white">
              Works With
            </h4>

            <div className="flex flex-wrap gap-2">

              {aiTools.map(
                (tool) => (
                  <span
                    key={tool}
                    className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300"
                  >
                    {tool}
                  </span>
                )
              )}

            </div>

          </div>
        )}

        {/* Author */}

        {item.author_name && (
          <div className="mt-7 border-t border-zinc-800 pt-6">

            <p className="text-xs text-zinc-500">
              Created by
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-300">
              {item.author_name}
            </p>

          </div>
        )}

        {/* Rating / Reviews */}

        {(item.rating != null ||
          item.reviews != null ||
          item.review_count != null) && (
          <div className="mt-7 flex flex-wrap gap-5 border-t border-zinc-800 pt-6">

            {item.rating != null && (
              <div>

                <p className="text-xs text-zinc-500">
                  Rating
                </p>

                <p className="mt-1 text-sm text-yellow-400">
                  ⭐ {item.rating}
                </p>

              </div>
            )}

            {(item.reviews != null ||
              item.review_count !=
                null) && (
              <div>

                <p className="text-xs text-zinc-500">
                  Reviews
                </p>

                <p className="mt-1 text-sm text-zinc-300">
                  {item.reviews ??
                    item.review_count}
                </p>

              </div>
            )}

          </div>
        )}

        {/* Actions */}

        <div className="mt-8 flex flex-wrap gap-3">

          <Link
            href={`/prompt/${item.slug}`}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Open Full Details
          </Link>

          {item.prompt && (
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  item.prompt || ""
                )
              }
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Copy Prompt
            </button>
          )}

        </div>

      </div>

    </article>
  );
}