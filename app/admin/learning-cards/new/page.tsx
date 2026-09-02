"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import SeoPanel from "@/components/cms/SeoPanel";
import {
  emptySeoFields,
  seoFieldsToRow,
} from "@/lib/cms/seoFields";
import MediaPicker from "@/components/cms/MediaPicker";
import ThumbnailPicker from "@/components/cms/ThumbnailPicker";
import RichTextEditor from "@/components/cms/RichTextEditor";
import RelatedContentPicker from "@/components/cms/RelatedContentPicker";
import type { RelatedContentItem } from "@/lib/cms/relatedContent";
import {
  emptyMediaFields,
  mediaFieldsToRow,
} from "@/lib/cms/mediaFields";

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

type LearningCardBlock = {
  id: string;
  block_type: BlockType;
  content: Record<string, unknown>;
};

function createBlock(type: BlockType): LearningCardBlock {
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

export default function CreateLearningCardPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [media, setMedia] = useState(
    emptyMediaFields()
  );
  const [thumbnailUrl, setThumbnailUrl] =
    useState("");

  const [seo, setSeo] = useState(
    emptySeoFields()
  );

  const [isPublished, setIsPublished] = useState(false);

  const [blocks, setBlocks] = useState<LearningCardBlock[]>([]);
  const [contentHtml, setContentHtml] = useState("");
  const [relatedContent, setRelatedContent] = useState<
    RelatedContentItem[]
  >([]);

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
          "Learning card title is required."
        );
      }

      if (!cleanSlug) {
        throw new Error(
          "Learning card slug is required."
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

      const cardId = crypto.randomUUID();

      const { error: cardError } =
        await supabase
          .from("learning_cards")
          .insert({
            id: cardId,
            title: cleanTitle,
            slug: cleanSlug,
            summary:
              summary.trim() || null,
            category:
              category.trim() || null,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            author:
              author.trim() || null,
            cover_image_url:
              coverImage.trim() || null,
            is_published: publish,
            published_at: publish
              ? new Date().toISOString()
              : null,
            ...seoFieldsToRow(seo),
            ...mediaFieldsToRow(media),
            thumbnail_url:
              thumbnailUrl.trim() || null,
            content_html: contentHtml,
            related_content: relatedContent,
          });

      if (cardError) {
        throw new Error(
          [
            "LEARNING CARD INSERT FAILED",
            `Code: ${cardError.code || "unknown"}`,
            `Message: ${
              cardError.message ||
              "Unknown error"
            }`,
            `Details: ${
              cardError.details ||
              "none"
            }`,
            `Hint: ${
              cardError.hint ||
              "none"
            }`,
          ].join("\n")
        );
      }

      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      router.push(
        `/admin/learning-cards/${cardId}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Failed to create learning card:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create learning card."
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
            href="/admin/learning-cards"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back to Learning Cards
          </Link>

          <div className="mt-5">

            <p className="text-sm font-semibold uppercase tracking-wider text-brand">
              Admin / Learning Cards
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Create Learning Card
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
              Unable to save learning card
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
            Learning Card Information
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
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
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
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
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
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
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
                  className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
                />

              </div>

            </div>

            {/* Tags */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Tags{" "}
                <span className="text-zinc-600">
                  (comma separated)
                </span>
              </label>

              <input
                type="text"
                value={tags}
                onChange={(event) =>
                  setTags(event.target.value)
                }
                placeholder="machine learning, neural networks, transformers"
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
              />

            </div>

            {/* Summary */}

            <div>

              <label className="text-sm font-medium text-zinc-300">
                Summary
              </label>

              <textarea
                value={summary}
                onChange={(event) =>
                  setSummary(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Short summary of the learning card..."
                className="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
              />

            </div>

            {/* Cover Image */}

            <div>
              <MediaPicker
                label="Cover Image"
                media={media}
                onMediaChange={setMedia}
                url={coverImage}
                onUrlChange={setCoverImage}
              />
            </div>

            <div>
              <ThumbnailPicker
                url={thumbnailUrl}
                onUrlChange={setThumbnailUrl}
              />
            </div>

          </div>

        </section>

        {/* =========================
            SEO & SOCIAL MEDIA
        ========================= */}

        <section className="mt-8">
          <SeoPanel
            seo={seo}
            onChange={setSeo}
            suggestedTitle={title}
            suggestedDescription={summary}
            suggestedImageUrl={coverImage}
          />
        </section>

        {/* =========================
            CONTENT
        ========================= */}

        <section className="mt-8">

          <h2 className="text-xl font-semibold">
            Content
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Write your article using the toolbar below — just like a word processor.
          </p>

          <div className="mt-5">
            <RichTextEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Start writing your learning card..."
            />
          </div>

        </section>

        {/* =========================
            RELATED CONTENT
        ========================= */}

        <section className="mt-8">
          <RelatedContentPicker
            value={relatedContent}
            onChange={setRelatedContent}
          />
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
              className="h-4 w-4 accent-brand"
            />

            <span className="text-sm text-zinc-300">
              Publish immediately
            </span>

          </label>

          <div className="mt-5 flex flex-wrap gap-3">

            <Link
              href="/admin/learning-cards"
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
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Publishing..."
                : "Publish"}
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}