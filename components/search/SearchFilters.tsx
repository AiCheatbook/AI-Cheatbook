"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SearchFiltersProps = {
  query: string;
  selectedTool: string;
  selectedCategory: string;
  tools: string[];
  categories: string[];
};

const mediaFilters = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Video",
    value: "video",
  },
  {
    label: "Image",
    value: "image",
  },
  {
    label: "Text",
    value: "text",
  },
  {
    label: "Audio",
    value: "audio",
  },
  {
    label: "Other",
    value: "other",
  },
];

export default function SearchFilters({
  query,
  selectedTool,
  selectedCategory,
  tools,
  categories,
}: SearchFiltersProps) {
  const searchParams = useSearchParams();

  const selectedType =
    searchParams.get("type") || "all";

  const selectedSlug =
    searchParams.get("selected") || "";

  function createUrl({
    type,
    tool,
    category,
    clearAll = false,
  }: {
    type?: string;
    tool?: string;
    category?: string;
    clearAll?: boolean;
  }) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (clearAll) {
      params.delete("tool");
      params.delete("category");
      params.delete("type");
      params.delete("selected");

      const queryString = params.toString();

      return queryString
        ? `/search?${queryString}`
        : "/search";
    }

    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    if (tool !== undefined) {
      if (tool) {
        params.set("tool", tool);
      } else {
        params.delete("tool");
      }
    }

    if (category !== undefined) {
      if (category) {
        params.set(
          "category",
          category
        );
      } else {
        params.delete("category");
      }
    }

    if (type !== undefined) {
      if (type && type !== "all") {
        params.set("type", type);
      } else {
        params.delete("type");
      }
    }

    if (selectedSlug) {
      params.set(
        "selected",
        selectedSlug
      );
    }

    const queryString = params.toString();

    return queryString
      ? `/search?${queryString}`
      : "/search";
  }

  const hasAdvancedFilters =
    Boolean(selectedTool) ||
    Boolean(selectedCategory);

  return (
    <div className="space-y-4">

      {/* Media Filters */}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {mediaFilters.map((filter) => {
          const isSelected =
            filter.value === "all"
              ? selectedType === "all"
              : selectedType ===
                filter.value;

          return (
            <Link
              key={filter.value}
              href={createUrl({
                type: filter.value,
              })}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "bg-brand text-white shadow-lg shadow-brand/10"
                  : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* AI Tool + Category */}

      <div className="flex flex-col gap-3 sm:flex-row">

        {/* AI Tool */}

        <details className="group relative flex-1">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm transition hover:border-zinc-700 hover:bg-zinc-900">
            <span
              className={
                selectedTool
                  ? "text-white"
                  : "text-zinc-500"
              }
            >
              {selectedTool || "AI Tool"}
            </span>

            <svg
              className="h-4 w-4 text-zinc-500 transition group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">

            <Link
              href={createUrl({
                tool: "",
              })}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                !selectedTool
                  ? "bg-brand/10 text-brand"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              All AI Tools
            </Link>

            {tools.map((tool) => (
              <Link
                key={tool}
                href={createUrl({
                  tool,
                })}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  selectedTool === tool
                    ? "bg-brand/10 text-brand"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {tool}
              </Link>
            ))}
          </div>
        </details>

        {/* Category */}

        <details className="group relative flex-1">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm transition hover:border-zinc-700 hover:bg-zinc-900">
            <span
              className={
                selectedCategory
                  ? "text-white"
                  : "text-zinc-500"
              }
            >
              {selectedCategory ||
                "Category"}
            </span>

            <svg
              className="h-4 w-4 text-zinc-500 transition group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">

            <Link
              href={createUrl({
                category: "",
              })}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                !selectedCategory
                  ? "bg-brand/10 text-brand"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              All Categories
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                href={createUrl({
                  category,
                })}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  selectedCategory ===
                  category
                    ? "bg-brand/10 text-brand"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>
        </details>

        {/* Clear Filters */}

        {hasAdvancedFilters && (
          <Link
            href={createUrl({
              clearAll: true,
            })}
            className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-brand hover:text-brand"
          >
            Clear Filters
          </Link>
        )}
      </div>

      {/* Active Filters */}

      {(selectedTool ||
        selectedCategory ||
        selectedType !== "all") && (
        <div className="flex flex-wrap items-center gap-2">

          <span className="mr-1 text-xs text-zinc-600">
            Active:
          </span>

          {selectedTool && (
            <Link
              href={createUrl({
                tool: "",
              })}
              className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand transition hover:bg-brand/20"
            >
              Tool: {selectedTool} ×
            </Link>
          )}

          {selectedCategory && (
            <Link
              href={createUrl({
                category: "",
              })}
              className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand transition hover:bg-brand/20"
            >
              Category:{" "}
              {selectedCategory} ×
            </Link>
          )}

          {selectedType !== "all" && (
            <Link
              href={createUrl({
                type: "all",
              })}
              className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs capitalize text-brand transition hover:bg-brand/20"
            >
              Type: {selectedType} ×
            </Link>
          )}
        </div>
      )}
    </div>
  );
}