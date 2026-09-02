"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  author: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
};

type NewsBlock = {
  id: string;
  news_id?: string;
  block_type: string;
  sort_order: number;
  content: Record<string, unknown>;
};

type PreviewData = {
  news: NewsItem;
  blocks: NewsBlock[];
};

/* =========================================================
   PREVIEW STORAGE
========================================================= */

const PREVIEW_KEY = "ai-cheatbook-news-preview";

function getPreviewSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(PREVIEW_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribeToPreview(
  callback: () => void
) {
  window.addEventListener(
    "storage",
    callback
  );

  return () => {
    window.removeEventListener(
      "storage",
      callback
    );
  };
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function NewsPreviewPage() {
  const params = useParams();

  const raw = useSyncExternalStore(
    subscribeToPreview,
    getPreviewSnapshot,
    getServerSnapshot
  );

  const preview = parsePreviewData(raw);

  const editorUrl =
    typeof params?.id === "string"
      ? `/admin/news/${params.id}`
      : "/admin/news";

  /* =======================================================
     ERROR
  ======================================================= */

  if (raw && !preview) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-4xl">

          <Link
            href={editorUrl}
            className="text-sm text-zinc-600 transition hover:text-zinc-900"
          >
            ← Back to Editor
          </Link>

          <div className="mt-8 rounded-2xl border border-red-900/50 bg-white p-8">

            <h1 className="text-2xl font-semibold text-red-400">
              Preview unavailable
            </h1>

            <p className="mt-4 text-zinc-600">
              The preview data is invalid or corrupted.
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              Go back to the editor and click Preview again.
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* =======================================================
     NO PREVIEW DATA
  ======================================================= */

  if (!raw) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-4xl">

          <Link
            href={editorUrl}
            className="text-sm text-zinc-600 transition hover:text-zinc-900"
          >
            ← Back to Editor
          </Link>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10">

            <h1 className="text-2xl font-semibold text-zinc-900">
              No Preview Data
            </h1>

            <p className="mt-4 text-zinc-600">
              Go back to the editor and click Preview again.
            </p>

            <Link
              href={editorUrl}
              className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-black transition hover:bg-brand"
            >
              Back to Editor
            </Link>

          </div>

        </div>
      </main>
    );
  }

  if (!preview) {
    return null;
  }

  const { news, blocks } = preview;

  /* =======================================================
     PREVIEW
  ======================================================= */

  return (
    <main className="min-h-screen bg-white text-zinc-900">

      {/* ===================================================
          PREVIEW BAR
      =================================================== */}

      <div className="sticky top-0 z-50 border-b border-brand/30 bg-white/95 px-6 py-3 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-black">
              PREVIEW
            </span>

            <span className="hidden text-sm text-zinc-600 sm:block">
              Unsaved editor preview
            </span>

          </div>

          <Link
            href={editorUrl}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900"
          >
            ← Back to Editor
          </Link>

        </div>

      </div>

      {/* ===================================================
          ARTICLE
      =================================================== */}

      <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16">

        {/* CATEGORY */}

        {news.category && (
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            {news.category}
          </p>
        )}

        {/* TITLE */}

        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
          {news.title}
        </h1>

        {/* EXCERPT */}

        {news.excerpt && (
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            {news.excerpt}
          </p>
        )}

        {/* META */}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-zinc-600">

          {news.author && (
            <span>
              By {news.author}
            </span>
          )}

          {news.author && news.published_at && (
            <span className="text-zinc-700">
              •
            </span>
          )}

          {news.published_at && (
            <span>
              {formatDate(news.published_at)}
            </span>
          )}

        </div>

        {/* COVER IMAGE */}

        {news.cover_image_url && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

            <img
              src={news.cover_image_url}
              alt={news.title}
              className="h-auto w-full object-cover"
            />

          </div>
        )}

        {/* CONTENT BLOCKS */}

        {blocks.length > 0 && (
          <div className="mt-10">

            <div className="space-y-8">

              {blocks
                .slice()
                .sort(
                  (a, b) =>
                    a.sort_order -
                    b.sort_order
                )
                .map(
                  (block, index) => (
                    <PreviewBlock
                      key={
                        block.id ||
                        `${block.block_type}-${index}`
                      }
                      block={block}
                    />
                  )
                )}

            </div>

          </div>
        )}

        {/* EMPTY CONTENT */}

        {blocks.length === 0 && (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 text-center">

            <p className="text-zinc-600">
              This article has no content yet.
            </p>

          </div>
        )}

      </article>

    </main>
  );
}

/* =========================================================
   PARSE PREVIEW DATA
========================================================= */

function parsePreviewData(
  raw: string | null
): PreviewData | null {

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw
    ) as PreviewData;

    if (
      !parsed ||
      !parsed.news ||
      !Array.isArray(parsed.blocks)
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "PREVIEW PARSE ERROR:",
      error
    );

    return null;
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  date: string
) {
  const parsed = new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

/* =========================================================
   BLOCK RENDERER
========================================================= */

function PreviewBlock({
  block,
}: {
  block: NewsBlock;
}) {

  const content =
    block.content || {};

  /* =======================================================
     HEADING
  ======================================================= */

  if (
    block.block_type ===
      "heading" ||
    block.block_type ===
      "h2"
  ) {

    const text =
      typeof content.text ===
      "string"
        ? content.text
        : "";

    if (!text) {
      return null;
    }

    return (
      <h2 className="text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">
        {text}
      </h2>
    );
  }

  /* =======================================================
     PARAGRAPH
  ======================================================= */

  if (
    block.block_type ===
    "paragraph"
  ) {

    const text =
      typeof content.text ===
      "string"
        ? content.text
        : "";

    if (!text) {
      return null;
    }

    return (
      <p className="whitespace-pre-wrap text-base leading-8 text-zinc-600">
        {text}
      </p>
    );
  }

  /* =======================================================
     BULLETS
  ======================================================= */

  if (
    block.block_type ===
    "bullets"
  ) {

    const items =
      getStringArray(
        content.items
      );

    if (items.length === 0) {
      return null;
    }

    return (
      <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-zinc-600">

        {items.map(
          (item, index) => (
            <li key={index}>
              {item}
            </li>
          )
        )}

      </ul>
    );
  }

  /* =======================================================
     NUMBERED LIST
  ======================================================= */

  if (
    block.block_type ===
    "numbered_list"
  ) {

    const items =
      getStringArray(
        content.items
      );

    if (items.length === 0) {
      return null;
    }

    return (
      <ol className="list-decimal space-y-2 pl-6 text-base leading-7 text-zinc-600">

        {items.map(
          (item, index) => (
            <li key={index}>
              {item}
            </li>
          )
        )}

      </ol>
    );
  }

  /* =======================================================
     IMAGE
  ======================================================= */

  if (
    block.block_type ===
    "image"
  ) {

    const url =
      typeof content.url ===
      "string"
        ? content.url
        : "";

    const alt =
      typeof content.alt ===
      "string"
        ? content.alt
        : "";

    const caption =
      typeof content.caption ===
      "string"
        ? content.caption
        : "";

    if (!url) {
      return null;
    }

    return (
      <figure>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <img
            src={url}
            alt={
              alt ||
              "News image"
            }
            className="h-auto w-full object-cover"
          />

        </div>

        {caption && (
          <figcaption className="mt-3 text-center text-sm text-zinc-600">
            {caption}
          </figcaption>
        )}

      </figure>
    );
  }

  /* =======================================================
     VIDEO
  ======================================================= */

  if (
    block.block_type ===
    "video"
  ) {

    const url =
      typeof content.url ===
      "string"
        ? content.url
        : "";

    const caption =
      typeof content.caption ===
      "string"
        ? content.caption
        : "";

    if (!url) {
      return null;
    }

    return (
      <figure>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <video
            src={url}
            controls
            className="w-full"
          />

        </div>

        {caption && (
          <figcaption className="mt-3 text-center text-sm text-zinc-600">
            {caption}
          </figcaption>
        )}

      </figure>
    );
  }

  /* =======================================================
     QUOTE
  ======================================================= */

  if (
    block.block_type ===
    "quote"
  ) {

    const text =
      typeof content.text ===
      "string"
        ? content.text
        : "";

    const author =
      typeof content.author ===
      "string"
        ? content.author
        : "";

    if (!text) {
      return null;
    }

    return (
      <blockquote className="border-l-2 border-brand pl-5">

        <p className="text-lg italic leading-8 text-zinc-700">
          “{text}”
        </p>

        {author && (
          <footer className="mt-3 text-sm text-zinc-600">
            — {author}
          </footer>
        )}

      </blockquote>
    );
  }

  /* =======================================================
     DIVIDER
  ======================================================= */

  if (
    block.block_type ===
    "divider"
  ) {

    return (
      <div className="py-2">
        <div className="h-px bg-zinc-100" />
      </div>
    );
  }

  /* =======================================================
     CODE
  ======================================================= */

  if (
    block.block_type ===
    "code"
  ) {

    const code =
      typeof content.code ===
      "string"
        ? content.code
        : "";

    if (!code) {
      return null;
    }

    return (
      <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-5">

        <code className="font-mono text-sm leading-7 text-zinc-600">
          {code}
        </code>

      </pre>
    );
  }

  /* =======================================================
     UNKNOWN BLOCK
  ======================================================= */

  return null;
}

/* =========================================================
   STRING ARRAY HELPER
========================================================= */

function getStringArray(
  value: unknown
): string[] {

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item ===
        "string" &&
      item.trim().length > 0
  );
}