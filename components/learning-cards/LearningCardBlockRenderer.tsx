"use client";

import Image from "next/image";

type LearningCardBlock = {

  id: string;
  learning_card_id: string;

  block_type: string;
  sort_order: number;
  content: Record<string, unknown>;
};

type LearningCardBlockRendererProps = {
  blocks: LearningCardBlock[];
};

export default function LearningCardBlockRenderer({
  blocks,
}: LearningCardBlockRendererProps) {
  return (
    <div className="space-y-8">
      {blocks.map((block) => (
        <LearningCardBlockItem
          key={block.id}
          blockType={block.block_type}
          content={block.content}
        />
      ))}
    </div>
  );
}

type LearningCardBlockItemProps = {
  blockType: string;
  content: Record<string, unknown>;
};

function getString(
  value: unknown
): string {
  return typeof value === "string"
    ? value
    : "";
}

function getStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function LearningCardBlockItem({
  blockType,
  content,
}: LearningCardBlockItemProps) {
  /* =========================
     HEADING
  ========================= */

  if (blockType === "heading") {
    const text = getString(
      content.text
    );

    if (!text) {
      return null;
    }

    return (
      <h2 className="text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">
        {text}
      </h2>
    );
  }

  /* =========================
     PARAGRAPH
  ========================= */

  if (blockType === "paragraph") {
    const text = getString(
      content.text
    );

    if (!text) {
      return null;
    }

    return (
      <p className="text-lg leading-8 text-zinc-400">
        {text}
      </p>
    );
  }

  /* =========================
     BULLETS
  ========================= */

  if (blockType === "bullets") {
    const items = getStringArray(
      content.items
    );

    if (items.length === 0) {
      return null;
    }

    return (
      <ul className="list-disc space-y-3 pl-6 text-lg leading-8 text-zinc-400">
        {items.map((item, index) => (
          <li key={index}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  /* =========================
     NUMBERED LIST
  ========================= */

  if (blockType === "numbered_list") {
    const items = getStringArray(
      content.items
    );

    if (items.length === 0) {
      return null;
    }

    return (
      <ol className="list-decimal space-y-3 pl-6 text-lg leading-8 text-zinc-400">
        {items.map((item, index) => (
          <li key={index}>
            {item}
          </li>
        ))}
      </ol>
    );
  }

  /* =========================
     IMAGE
  ========================= */

  if (blockType === "image") {
    const url = getString(
      content.url
    );

    const alt =
      getString(content.alt) ||
      "AI Cheatbook learning card image";

    const caption = getString(
      content.caption
    );

    if (!url) {
      return null;
    }

    return (
      <figure className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200">
          <Image
            src={url}
            alt={alt}
            width={1200}
            height={800}
            className="h-auto w-full object-cover"
          />
        </div>

        {caption && (
          <figcaption className="text-sm leading-6 text-zinc-400">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  /* =========================
     VIDEO
  ========================= */

  if (blockType === "video") {
    const url = getString(
      content.url
    );

    const caption = getString(
      content.caption
    );

    if (!url) {
      return null;
    }

    return (
      <figure className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <video
            src={url}
            controls
            preload="metadata"
            className="h-auto w-full"
          />
        </div>

        {caption && (
          <figcaption className="text-sm leading-6 text-zinc-400">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  /* =========================
     QUOTE
  ========================= */

  if (blockType === "quote") {
    const text = getString(
      content.text
    );

    const author = getString(
      content.author
    );

    if (!text) {
      return null;
    }

    return (
      <blockquote className="border-l-4 border-brand pl-6">
        <p className="text-xl italic leading-8 text-zinc-700">
          “{text}”
        </p>

        {author && (
          <cite className="mt-3 block text-sm not-italic text-zinc-400">
            — {author}
          </cite>
        )}
      </blockquote>
    );
  }

  /* =========================
     DIVIDER
  ========================= */

  if (blockType === "divider") {
    return (
      <div className="border-t border-zinc-200" />
    );
  }

  /* =========================
     CODE
  ========================= */

  if (blockType === "code") {
    const code = getString(
      content.code
    );

    if (!code) {
      return null;
    }

    return (
      <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-400">
        <code>{code}</code>
      </pre>
    );
  }

  /* =========================
     UNKNOWN BLOCK
  ========================= */

  console.warn(
    `Unknown learning card block type: ${blockType}`
  );

  return null;
}