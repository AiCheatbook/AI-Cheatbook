"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import SeoPanel from "@/components/cms/SeoPanel";
import KeywordTagInput, {
  type SelectedKeyword,
} from "@/components/cms/KeywordTagInput";
import {
  emptySeoFields,
  seoFieldsToRow,
} from "@/lib/cms/seoFields";
import { saveLibraryItemKeywords } from "@/lib/cms/promptKeywords";
import MediaPicker from "@/components/cms/MediaPicker";
import ThumbnailPicker from "@/components/cms/ThumbnailPicker";
import RichTextEditor from "@/components/cms/RichTextEditor";
import RelatedContentPicker from "@/components/cms/RelatedContentPicker";
import type { RelatedContentItem } from "@/lib/cms/relatedContent";
import {
  emptyMediaFields,
  mediaFieldsToRow,
} from "@/lib/cms/mediaFields";

const PROMPT_TYPES = [
  "prompt",
  "concept",
  "technique",
] as const;

const CATEGORIES = [
  "video",
  "image",
  "text",
  "audio",
  "other",
] as const;

const AI_TOOL_OPTIONS = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/*
 * The public prompt page still reads the
 * older "media_type" column (image / youtube /
 * hosted_video) to decide how to render media
 * (embedded video vs image vs video player).
 *
 * Rather than making the admin fill in two
 * separate "what kind of media is this"
 * fields, this derives it automatically from
 * the new Source picker.
 */

function deriveLegacyMediaType(
  source: string
): string | null {
  if (source === "youtube") {
    return "youtube";
  }

  if (
    source === "hostinger" ||
    source === "supabase_storage"
  ) {
    return "image";
  }

  return null;
}

export default function NewPromptPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] =
    useState<string>("prompt");
  const [category, setCategory] =
    useState("video");
  const [description, setDescription] =
    useState("");
  const [descriptionHtml, setDescriptionHtml] =
    useState("");
  const [relatedContent, setRelatedContent] =
    useState<RelatedContentItem[]>([]);
  const [promptText, setPromptText] =
    useState("");
  const [mediaUrl, setMediaUrl] =
    useState("");
  const [media, setMedia] = useState(
    emptyMediaFields()
  );
  const [thumbnailUrl, setThumbnailUrl] =
    useState("");
  const [authorName, setAuthorName] =
    useState("");
  const [aiTools, setAiTools] = useState<
    string[]
  >([]);
  const [keywords, setKeywords] = useState<
    SelectedKeyword[]
  >([]);

  const [isFeatured, setIsFeatured] =
    useState(false);
  const [isTrending, setIsTrending] =
    useState(false);
  const [isPublished, setIsPublished] =
    useState(false);

  const [seo, setSeo] = useState(
    emptySeoFields()
  );

  const [saving, setSaving] =
    useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(
    value: string
  ) {
    setTitle(value);

    if (!slug) {
      setSlug(generateSlug(value));
    }
  }

  function toggleAiTool(tool: string) {
    setAiTools((current) =>
      current.includes(tool)
        ? current.filter(
            (t) => t !== tool
          )
        : [...current, tool]
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
          "Prompt title is required."
        );
      }

      if (!cleanSlug) {
        throw new Error(
          "Prompt slug is required."
        );
      }

      const promptId = crypto.randomUUID();

      const { error: insertError } =
        await supabase
          .from("library_items")
          .insert({
            id: promptId,
            title: cleanTitle,
            slug: cleanSlug,
            type,
            category,
            description:
              description.trim() || null,
            description_html:
              descriptionHtml || null,
            related_content: relatedContent,
            prompt:
              promptText.trim() || null,
            media_type:
              deriveLegacyMediaType(
                media.source
              ),
            media_url:
              mediaUrl.trim() || null,
            ai_tools: aiTools,
            author_name:
              authorName.trim() || null,
            is_featured: isFeatured,
            is_trending: isTrending,
            is_published: publish,
            published_at: publish
              ? new Date().toISOString()
              : null,
            ...seoFieldsToRow(seo),
            ...mediaFieldsToRow(media),
            thumbnail_url:
              thumbnailUrl.trim() || null,
          });

      if (insertError) {
        throw new Error(
          [
            "PROMPT INSERT FAILED",
            `Code: ${insertError.code || "unknown"}`,
            `Message: ${
              insertError.message ||
              "Unknown error"
            }`,
            `Details: ${
              insertError.details ||
              "none"
            }`,
            `Hint: ${
              insertError.hint || "none"
            }`,
          ].join("\n")
        );
      }

      if (keywords.length > 0) {
        await saveLibraryItemKeywords(
          promptId,
          keywords
        );
      }

      router.push(
        `/admin/prompts/${promptId}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Failed to create prompt:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create prompt."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-zinc-900 outline-none transition placeholder:text-zinc-600 focus:border-brand";

  const textareaClass =
    "mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 outline-none transition placeholder:text-zinc-600 focus:border-brand";

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}

        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/prompts"
              className="text-sm text-zinc-600 hover:text-zinc-600"
            >
              ← Back to Prompt Library
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              New Prompt
            </h1>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* DETAILS */}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Details
          </h2>

          <div className="mt-4 grid gap-5">
            <div>
              <label className="text-sm font-medium text-zinc-600">
                Title
              </label>
              <input
                value={title}
                onChange={(e) =>
                  handleTitleChange(
                    e.target.value
                  )
                }
                placeholder="e.g. Cinematic Static Shot"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600">
                URL Slug
              </label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    generateSlug(
                      e.target.value
                    )
                  )
                }
                placeholder="cinematic-static-shot"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-600">
                aicheatbook.com/prompt/
                {slug || "..."}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-600">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                  className={inputClass}
                >
                  {PROMPT_TYPES.map(
                    (t) => (
                      <option
                        key={t}
                        value={t}
                      >
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-600">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  {CATEGORIES.map(
                    (c) => (
                      <option
                        key={c}
                        value={c}
                      >
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Short description shown on the prompt card..."
                className={textareaClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600">
                Full Details{" "}
                <span className="text-zinc-600">
                  (optional, shown on the
                  prompt's own page)
                </span>
              </label>

              <div className="mt-2">
                <RichTextEditor
                  content={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Add a longer explanation, examples, or tips for this prompt..."
                />
              </div>
            </div>

            <div>
              <RelatedContentPicker
                value={relatedContent}
                onChange={setRelatedContent}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600">
                Prompt Content
              </label>
              <textarea
                value={promptText}
                onChange={(e) =>
                  setPromptText(
                    e.target.value
                  )
                }
                rows={6}
                placeholder="The actual prompt text users will copy..."
                className={textareaClass}
              />
            </div>

            <div>
              <MediaPicker
                label="Preview Media"
                media={media}
                onMediaChange={setMedia}
                url={mediaUrl}
                onUrlChange={setMediaUrl}
              />
            </div>

            <div>
              <ThumbnailPicker
                url={thumbnailUrl}
                onUrlChange={setThumbnailUrl}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600">
                Author Name{" "}
                <span className="text-zinc-600">
                  (optional)
                </span>
              </label>
              <input
                value={authorName}
                onChange={(e) =>
                  setAuthorName(
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* AI TOOLS */}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            AI Tools
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            Which tools does this prompt work
            with?
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {AI_TOOL_OPTIONS.map((tool) => {
              const selected =
                aiTools.includes(tool);

              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() =>
                    toggleAiTool(tool)
                  }
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? "border-brand bg-brand/15 text-brand-text"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-600"
                  }`}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </section>

        {/* KEYWORDS */}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Keywords
          </h2>

          <p className="mt-1 text-sm text-zinc-600">
            Type an existing keyword to reuse
            it, or a new one to create it.
          </p>

          <div className="mt-4">
            <KeywordTagInput
              value={keywords}
              onChange={setKeywords}
            />
          </div>
        </section>

        {/* FLAGS */}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Visibility
          </h2>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) =>
                  setIsFeatured(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-zinc-300 bg-white"
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) =>
                  setIsTrending(
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-zinc-300 bg-white"
              />
              Trending
            </label>
          </div>
        </section>

        {/* SEO */}

        <section className="mt-8">
          <SeoPanel
            seo={seo}
            onChange={setSeo}
            suggestedTitle={title}
            suggestedDescription={
              description
            }
            suggestedImageUrl={mediaUrl}
          />
        </section>

        {/* ACTIONS */}

        <div className="mt-10 flex items-center gap-3 border-t border-zinc-200 pt-6">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleSubmit(false)
            }
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleSubmit(true)
            }
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Publish"}
          </button>
        </div>
      </div>
    </main>
  );
}
