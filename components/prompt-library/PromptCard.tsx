"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const SAVED_KEYWORDS_STORAGE_KEY =
  "ai-cheatbook-saved-keywords";

const KEYWORDS_UPDATED_EVENT =
  "ai-cheatbook-keywords-updated";

type PromptCardProps = {
  slug: string;
  title: string;
  type: string;
  category: string;
  description: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  aiTools: string[];
  keywords?: string[];
};

export default function PromptCard({
  slug,
  title,
  type,
  category,
  description,
  mediaType,
  mediaUrl,
  aiTools,
  keywords = [],
}: PromptCardProps) {
  const [added, setAdded] = useState(false);

  function handleAddKeywords() {
    if (keywords.length === 0) {
      return;
    }

    try {
      const storedKeywords =
        localStorage.getItem(
          SAVED_KEYWORDS_STORAGE_KEY
        );

      const existingKeywords = JSON.parse(
        storedKeywords || "[]"
      );

      const safeKeywords = Array.isArray(
        existingKeywords
      )
        ? existingKeywords
        : [];

      const updatedKeywords = Array.from(
        new Set([
          ...safeKeywords,
          ...keywords,
        ])
      );

      localStorage.setItem(
        SAVED_KEYWORDS_STORAGE_KEY,
        JSON.stringify(updatedKeywords)
      );

      window.dispatchEvent(
        new Event(KEYWORDS_UPDATED_EVENT)
      );

      setAdded(true);

      window.setTimeout(() => {
        setAdded(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to save prompt keywords:",
        error
      );
    }
  }

  /*
   * Image priority:
   *
   * 1. Supabase media_url
   * 2. Local static-shot image
   * 3. Local demo image
   */

  const image =
    mediaUrl ||
    (slug === "static-shot"
      ? "/concepts/static-shot.jpg"
      : "/prompts/demo.jpg");

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-brand">

      {/* Image */}

      <Link href={`/prompt/${slug}`}>
        <div className="relative h-56 overflow-hidden bg-zinc-950">

          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />

        </div>
      </Link>

      {/* Content */}

      <div className="p-5">

        {/* Top Row */}

        <div className="flex items-center justify-between gap-3">

          <span className="rounded-full bg-brand/20 px-3 py-1 text-xs font-medium text-brand">
            {aiTools?.[0] || "AI"}
          </span>

          <span className="text-xs text-zinc-500">
            {type}
          </span>

        </div>

        {/* Title */}

        <Link href={`/prompt/${slug}`}>
          <h3 className="mt-4 text-xl font-semibold text-white transition hover:text-brand">
            {title}
          </h3>
        </Link>

        {/* Category */}

        <p className="mt-2 text-sm text-zinc-400">
          {category} • Verified
        </p>

        {/* Description */}

        {description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">
            {description}
          </p>
        )}

        {/* AI Tools */}

        {aiTools.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">

            {aiTools.map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
              >
                {tool}
              </span>
            ))}

          </div>
        )}

        {/* Keywords */}

        {keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">

            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
              >
                {keyword}
              </span>
            ))}

          </div>
        )}

        {/* Add Keywords */}

        <button
          type="button"
          onClick={handleAddKeywords}
          disabled={keywords.length === 0}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {added
            ? "✓ Keywords Added"
            : "+ Add Keywords to Generator"}
        </button>

        {/* View Prompt */}

        <Link
          href={`/prompt/${slug}`}
          className="mt-2 block w-full rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:border-brand hover:text-brand"
        >
          View Prompt →
        </Link>

      </div>
    </article>
  );
}