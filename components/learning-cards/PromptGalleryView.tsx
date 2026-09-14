"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Copy, Check, Download } from "lucide-react";

type GalleryItem = {
  key: string;
  slug: string | null;
  title: string;
  promptText: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  extraImages: string[];
};

type PromptGalleryViewProps = {
  eyebrow: string | null;
  title: string;
  summary: string | null;
  howToUse: string | null;
  templateUrl: string | null;
  templateLabel: string | null;
  items: GalleryItem[];
};

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const [copied, setCopied] = useState(false);
  const panels = [item.mediaUrl, ...item.extraImages].filter(
    (url): url is string => Boolean(url)
  );

  function handleCopy() {
    if (!item.promptText) return;
    navigator.clipboard.writeText(item.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {panels.length > 0 && (
        <div className="flex divide-x divide-zinc-200 bg-zinc-100">
          {panels.slice(0, 3).map((url, i) => (
            <div key={i} className="relative aspect-square flex-1">
              {item.mediaType === "hosted_video" && i === 0 ? (
                <video
                  src={url}
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={url}
                  alt={item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        <p className="text-xs font-semibold text-brand-text">
          {String(index + 1).padStart(2, "0")}
          {item.category ? ` · ${item.category}` : ""}
        </p>
        <p className="mt-1 text-base font-bold text-zinc-900">
          {item.title}
        </p>

        {item.promptText && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="max-h-24 overflow-y-auto text-xs leading-relaxed text-zinc-600">
              {item.promptText}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-brand-dark"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Copy Prompt
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PromptGalleryView({
  eyebrow,
  title,
  summary,
  howToUse,
  templateUrl,
  templateLabel,
  items,
}: PromptGalleryViewProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(
      items.map((i) => i.category).filter((c): c is string => Boolean(c))
    );
    return Array.from(set);
  }, [items]);

  const filtered = items.filter((item) => {
    if (
      activeCategory !== "all" &&
      item.category !== activeCategory
    ) {
      return false;
    }
    if (
      search.trim() &&
      !item.title.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wide text-brand-text">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 text-4xl font-bold text-zinc-900 sm:text-5xl">
        {title}
      </h1>
      {summary && (
        <p className="mt-3 max-w-2xl text-zinc-600">{summary}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                activeCategory === "all"
                  ? "border-brand bg-brand text-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:border-brand/50"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  activeCategory === c
                    ? "border-brand bg-brand text-zinc-900"
                    : "border-zinc-300 text-zinc-600 hover:border-brand/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {howToUse && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-zinc-900">How to use </span>
            {howToUse}
          </p>
          {templateUrl && (
            <a
              href={templateUrl}
              download
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand/50"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              {templateLabel || "Download Template"}
            </a>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-zinc-500">
        Showing {filtered.length} of {items.length}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <GalleryCard key={item.key} item={item} index={i} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-600">No prompts match your search.</p>
        </div>
      )}
    </div>
  );
}
