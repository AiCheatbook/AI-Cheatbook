"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type BlockType =
  | "heading"
  | "paragraph"
  | "bullets"
  | "numbered_list"
  | "image"
  | "video"
  | "quote"
  | "divider"
  | "code";

type NewsBlock = {
  id: string;
  block_type: BlockType;
  content: Record<string, unknown>;
};

function createBlock(type: BlockType): NewsBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "heading":
      return {
        id,
        block_type: type,
        content: {
          text: "",
        },
      };

    case "paragraph":
      return {
        id,
        block_type: type,
        content: {
          text: "",
        },
      };

    case "bullets":
    case "numbered_list":
      return {
        id,
        block_type: type,
        content: {
          items: [""],
        },
      };

    case "image":
      return {
        id,
        block_type: type,
        content: {
          url: "",
          alt: "",
          caption: "",
        },
      };

    case "video":
      return {
        id,
        block_type: type,
        content: {
          url: "",
          caption: "",
        },
      };

    case "quote":
      return {
        id,
        block_type: type,
        content: {
          text: "",
          author: "",
        },
      };

    case "divider":
      return {
        id,
        block_type: type,
        content: {},
      };

    case "code":
      return {
        id,
        block_type: type,
        content: {
          code: "",
        },
      };

    default:
      return {
        id,
        block_type: "paragraph",
        content: {
          text: "",
        },
      };
  }
}

export default function CreateNewsPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [author, setAuthor] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [isPublished, setIsPublished] = useState(false);

  const [blocks, setBlocks] = useState<NewsBlock[]>([]);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slug) {
      setSlug(generateSlug(value));
    }
  }

  function addBlock(type: BlockType) {
    setBlocks((current) => [
      ...current,
      createBlock(type),
    ]);
  }

  function removeBlock(id: string) {
    setBlocks((current) =>
      current.filter((block) => block.id !== id)
    );
  }

  function moveBlock(
    index: number,
    direction: "up" | "down"
  ) {
    setBlocks((current) => {
      const next = [...current];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      const temp = next[index];

      next[index] = next[targetIndex];

      next[targetIndex] = temp;

      return next;
    });
  }

  function updateBlock(
    id: string,
    content: Record<string, unknown>
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id
          ? {
              ...block,
              content,
            }
          : block
      )
    );
  }

  function updateBlockField(
    id: string,
    field: string,
    value: unknown
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id
          ? {
              ...block,
              content: {
                ...block.content,
                [field]: value,
              },
            }
          : block
      )
    );
  }

  function updateListItem(
    id: string,
    index: number,
    value: string
  ) {
    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== id) {
          return block;
        }

        const items = Array.isArray(
          block.content.items
        )
          ? [...block.content.items]
          : [];

        items[index] = value;

        return {
          ...block,
          content: {
            ...block.content,
            items,
          },
        };
      })
    );
  }

  function addListItem(id: string) {
    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== id) {
          return block;
        }

        const items = Array.isArray(
          block.content.items
        )
          ? [...block.content.items, ""]
          : [""];

        return {
          ...block,
          content: {
            ...block.content,
            items,
          },
        };
      })
    );
  }

  function removeListItem(
    id: string,
    index: number
  ) {
    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== id) {
          return block;
        }

        const items = Array.isArray(
          block.content.items
        )
          ? block.content.items.filter(
              (_, itemIndex) =>
                itemIndex !== index
            )
          : [];

        return {
          ...block,
          content: {
            ...block.content,
            items:
              items.length > 0
                ? items
                : [""],
          },
        };
      })
    );
  }

  async function handleSubmit(
    publish: boolean
  ) {
    try {
      setSaving(true);
      setError("");

      const cleanTitle = title.trim();

      const cleanSlug =
        slug.trim() ||
        generateSlug(cleanTitle);

      if (!cleanTitle) {
        throw new Error(
          "News title is required."
        );
      }

      if (!cleanSlug) {
        throw new Error(
          "News slug is required."
        );
      }

      /*
       * =====================================================
       * CREATE NEWS
       *
       * IMPORTANT:
       * We generate the ID ourselves instead of using
       * .select("id").single().
       *
       * This prevents draft creation from depending on
       * SELECT RLS policies.
       * =====================================================
       */

      const newsId = crypto.randomUUID();

      const { error: newsError } =
        await supabase
          .from("news")
          .insert({
            id: newsId,
            title: cleanTitle,
            slug: cleanSlug,
            excerpt:
              excerpt.trim() || null,
            category:
              category.trim() || null,
            author:
              author.trim() || null,
            cover_image_url:
              coverImage.trim() || null,
            is_published: publish,
            published_at: publish
              ? new Date().toISOString()
              : null,
          });

      if (newsError) {
        throw new Error(
          [
            "NEWS INSERT FAILED",
            `Code: ${newsError.code || "unknown"}`,
            `Message: ${
              newsError.message ||
              "Unknown error"
            }`,
            `Details: ${
              newsError.details ||
              "none"
            }`,
            `Hint: ${
              newsError.hint ||
              "none"
            }`,
          ].join("\n")
        );
      }

      /*
       * =====================================================
       * CREATE CONTENT BLOCKS
       * =====================================================
       */

      if (blocks.length > 0) {
        const blockRows = blocks.map(
          (block, index) => ({
            news_id: newsId,
            block_type:
              block.block_type,
            content:
              block.content,
            sort_order:
              index + 1,
          })
        );

        const {
          error: blocksError,
        } = await supabase
          .from("news_blocks")
          .insert(blockRows);

        if (blocksError) {
          /*
           * If blocks fail, try to remove the
           * news row that was just created.
           */
          await supabase
            .from("news")
            .delete()
            .eq("id", newsId);

          throw new Error(
            [
              "NEWS BLOCK INSERT FAILED",
              `Code: ${
                blocksError.code ||
                "unknown"
              }`,
              `Message: ${
                blocksError.message ||
                "Unknown error"
              }`,
              `Details: ${
                blocksError.details ||
                "none"
              }`,
              `Hint: ${
                blocksError.hint ||
                "none"
              }`,
            ].join("\n")
          );
        }
      }

      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      router.push(
        `/admin/news/${newsId}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Failed to create news:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create news."
      );
    } finally {
      setSaving(false);
    }
  }

  function blockLabel(
    type: BlockType
  ) {
    switch (type) {
      case "heading":
        return "Heading";

      case "paragraph":
        return "Paragraph";

      case "bullets":
        return "Bullet List";

      case "numbered_list":
        return "Numbered List";

      case "image":
        return "Image";

      case "video":
        return "Video";

      case "quote":
        return "Quote";

      case "divider":
        return "Divider";

      case "code":
        return "Code";

      default:
        return type;
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-8">

          <Link
            href="/admin/news"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back to News
          </Link>

          <div className="mt-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
              Admin / News
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Create News
            </h1>

            <p className="mt-2 text-zinc-400">
              Create an article using flexible content blocks.
            </p>

          </div>

        </div>

        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-900/50 bg-red-950/20 p-5">

            <p className="font-medium text-red-400">
              Unable to save news
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm text-red-300/70">
              {error}
            </p>

          </div>
        )}

        {/* =========================
            BASIC INFORMATION
        ========================= */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

          <h2 className="text-lg font-semibold">
            News Information
          </h2>

          <div className="mt-6 space-y-5">

            {/* Title */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  handleTitleChange(
                    event.target.value
                  )
                }
                placeholder="OpenAI launches a new AI model"
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
              />

            </div>

            {/* Slug */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Slug
              </label>

              <input
                type="text"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    generateSlug(
                      event.target.value
                    )
                  )
                }
                placeholder="openai-launches-new-ai-model"
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
              />

            </div>

            {/* Category + Author */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-zinc-300">
                  Category
                </label>

                <input
                  type="text"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                  placeholder="AI Models"
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                />

              </div>

              <div>

                <label className="text-sm font-medium text-zinc-300">
                  Author
                </label>

                <input
                  type="text"
                  value={author}
                  onChange={(event) =>
                    setAuthor(
                      event.target.value
                    )
                  }
                  placeholder="AI Cheatbook"
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                />

              </div>

            </div>

            {/* Excerpt */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Excerpt
              </label>

              <textarea
                value={excerpt}
                onChange={(event) =>
                  setExcerpt(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Short description of the news article..."
                className="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
              />

            </div>

            {/* Cover Image */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Cover Image URL
              </label>

              <input
                type="text"
                value={coverImage}
                onChange={(event) =>
                  setCoverImage(
                    event.target.value
                  )
                }
                placeholder="https://..."
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
              />

            </div>

          </div>

        </section>

        {/* =========================
            CONTENT BLOCKS
        ========================= */}

        <section className="mt-8">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Content
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Add and arrange any number of content blocks.
              </p>

            </div>

          </div>

          {/* Blocks */}

          <div className="mt-5 space-y-4">

            {blocks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-10 text-center">

                <p className="text-zinc-500">
                  No content blocks yet.
                </p>

                <p className="mt-1 text-sm text-zinc-600">
                  Choose a block below to start writing.
                </p>

              </div>
            )}

            {blocks.map(
              (block, index) => (
                <div
                  key={block.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >

                  {/* Block Header */}

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-sm font-semibold text-orange-500">
                      {blockLabel(
                        block.block_type
                      )}
                    </span>

                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          moveBlock(
                            index,
                            "up"
                          )
                        }
                        disabled={
                          index === 0
                        }
                        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveBlock(
                            index,
                            "down"
                          )
                        }
                        disabled={
                          index ===
                          blocks.length - 1
                        }
                        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeBlock(
                            block.id
                          )
                        }
                        className="rounded-lg border border-red-900/50 px-2.5 py-1.5 text-xs text-red-400 transition hover:bg-red-950/30"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                  {/* Heading */}

                  {block.block_type ===
                    "heading" && (
                    <input
                      type="text"
                      value={
                        typeof block.content
                          .text ===
                        "string"
                          ? block.content
                              .text
                          : ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateBlockField(
                          block.id,
                          "text",
                          event.target
                            .value
                        )
                      }
                      placeholder="Section heading..."
                      className="mt-4 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                    />
                  )}

                  {/* Paragraph */}

                  {block.block_type ===
                    "paragraph" && (
                    <textarea
                      value={
                        typeof block.content
                          .text ===
                        "string"
                          ? block.content
                              .text
                          : ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateBlockField(
                          block.id,
                          "text",
                          event.target
                            .value
                        )
                      }
                      rows={5}
                      placeholder="Write your paragraph..."
                      className="mt-4 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 leading-7 text-white outline-none focus:border-orange-500"
                    />
                  )}

                  {/* Lists */}

                  {(block.block_type ===
                    "bullets" ||
                    block.block_type ===
                      "numbered_list") && (
                    <div className="mt-4 space-y-3">

                      {(
                        Array.isArray(
                          block.content
                            .items
                        )
                          ? block.content
                              .items
                          : [""]
                      ).map(
                        (
                          item,
                          itemIndex
                        ) => (
                          <div
                            key={
                              itemIndex
                            }
                            className="flex gap-2"
                          >

                            <input
                              type="text"
                              value={
                                typeof item ===
                                "string"
                                  ? item
                                  : ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateListItem(
                                  block.id,
                                  itemIndex,
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder={`List item ${
                                itemIndex +
                                1
                              }`}
                              className="h-11 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeListItem(
                                  block.id,
                                  itemIndex
                                )
                              }
                              className="rounded-xl border border-zinc-800 px-3 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                            >
                              ×
                            </button>

                          </div>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          addListItem(
                            block.id
                          )
                        }
                        className="text-sm font-medium text-orange-500 hover:text-orange-400"
                      >
                        + Add item
                      </button>

                    </div>
                  )}

                  {/* Image */}

                  {block.block_type ===
                    "image" && (
                    <div className="mt-4 space-y-3">

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .url ===
                          "string"
                            ? block.content
                                .url
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "url",
                            event.target
                              .value
                          )
                        }
                        placeholder="Image URL"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .alt ===
                          "string"
                            ? block.content
                                .alt
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "alt",
                            event.target
                              .value
                          )
                        }
                        placeholder="Alt text"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .caption ===
                          "string"
                            ? block.content
                                .caption
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "caption",
                            event.target
                              .value
                          )
                        }
                        placeholder="Caption (optional)"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                    </div>
                  )}

                  {/* Video */}

                  {block.block_type ===
                    "video" && (
                    <div className="mt-4 space-y-3">

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .url ===
                          "string"
                            ? block.content
                                .url
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "url",
                            event.target
                              .value
                          )
                        }
                        placeholder="Video URL"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .caption ===
                          "string"
                            ? block.content
                                .caption
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "caption",
                            event.target
                              .value
                          )
                        }
                        placeholder="Caption (optional)"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                    </div>
                  )}

                  {/* Quote */}

                  {block.block_type ===
                    "quote" && (
                    <div className="mt-4 space-y-3">

                      <textarea
                        value={
                          typeof block.content
                            .text ===
                          "string"
                            ? block.content
                                .text
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "text",
                            event.target
                              .value
                          )
                        }
                        rows={3}
                        placeholder="Quote..."
                        className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none focus:border-orange-500"
                      />

                      <input
                        type="text"
                        value={
                          typeof block.content
                            .author ===
                          "string"
                            ? block.content
                                .author
                            : ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlockField(
                            block.id,
                            "author",
                            event.target
                              .value
                          )
                        }
                        placeholder="Author (optional)"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none focus:border-orange-500"
                      />

                    </div>
                  )}

                  {/* Code */}

                  {block.block_type ===
                    "code" && (
                    <textarea
                      value={
                        typeof block.content
                          .code ===
                        "string"
                          ? block.content
                              .code
                          : ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateBlockField(
                          block.id,
                          "code",
                          event.target
                            .value
                        )
                      }
                      rows={8}
                      placeholder="Paste code here..."
                      className="mt-4 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-white outline-none focus:border-orange-500"
                    />
                  )}

                  {/* Divider */}

                  {block.block_type ===
                    "divider" && (
                    <div className="mt-4 border-t border-zinc-800" />
                  )}

                </div>
              )
            )}

          </div>

          {/* =========================
              ADD BLOCK
          ========================= */}

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

            <p className="text-sm font-semibold text-zinc-300">
              Add Content Block
            </p>

            <div className="mt-4 flex flex-wrap gap-2">

              {(
                [
                  "heading",
                  "paragraph",
                  "bullets",
                  "numbered_list",
                  "image",
                  "video",
                  "quote",
                  "divider",
                  "code",
                ] as BlockType[]
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    addBlock(type)
                  }
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-orange-500 hover:bg-zinc-800 hover:text-white"
                >
                  + {blockLabel(type)}
                </button>
              ))}

            </div>

          </div>

        </section>

        {/* =========================
            PUBLISH
        ========================= */}

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <label className="flex cursor-pointer items-center gap-3">

            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) =>
                setIsPublished(
                  event.target.checked
                )
              }
              className="h-4 w-4 accent-orange-500"
            />

            <span className="text-sm text-zinc-300">
              Publish immediately
            </span>

          </label>

          <div className="mt-5 flex flex-wrap gap-3">

            <Link
              href="/admin/news"
              className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                handleSubmit(false)
              }
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                handleSubmit(true)
              }
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Publishing..."
                : "Publish News"}
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}