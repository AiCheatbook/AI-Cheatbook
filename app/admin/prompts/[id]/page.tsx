"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import SeoPanel from "@/components/cms/SeoPanel";
import KeywordTagInput, {
  type SelectedKeyword,
} from "@/components/cms/KeywordTagInput";
import {
  emptySeoFields,
  seoFieldsToRow,
  rowToSeoFields,
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
  rowToMediaFields,
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
 * hosted_video) to decide how to render media.
 * This derives it automatically from the new
 * Source picker instead of a second manual field.
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

type KeywordLinkRow = {
  sort_order: number | null;
  library_keywords:
    | {
        id: string;
        label: string;
      }[]
    | null;
};

export default function EditPromptPage() {
  const router = useRouter();
  const params = useParams();
  const promptId = params.id as string;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<string>("prompt");
  const [category, setCategory] = useState("video");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [relatedContent, setRelatedContent] = useState<
    RelatedContentItem[]
  >([]);
  const [promptText, setPromptText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [media, setMedia] = useState(emptyMediaFields());
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<SelectedKeyword[]>([]);

  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);

  const [seo, setSeo] = useState(emptySeoFields());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPrompt() {
      try {
        setLoading(true);

        const [promptResponse, keywordsResponse] =
          await Promise.all([
            supabase
              .from("library_items")
              .select(`
                id,
                title,
                slug,
                type,
                category,
                description,
                description_html,
                related_content,
                prompt,
                media_type,
                media_url,
                ai_tools,
                author_name,
                is_featured,
                is_trending,
                is_published,
                published_at,
                meta_title,
                meta_description,
                meta_keywords,
                canonical_url,
                og_title,
                og_description,
                og_image_url,
                image_alt_text,
                is_indexed,
                media_source,
                media_aspect_ratio,
                thumbnail_url
              `)
              .eq("id", promptId)
              .single(),

            supabase
              .from("library_item_keywords")
              .select(`
                sort_order,
                library_keywords (
                  id,
                  label
                )
              `)
              .eq("library_item_id", promptId)
              .order("sort_order", { ascending: true }),
          ]);

        if (cancelled) {
          return;
        }

        if (promptResponse.error) {
          throw promptResponse.error;
        }

        if (!promptResponse.data) {
          throw new Error("Prompt not found.");
        }

        const data = promptResponse.data;

        setTitle(data.title || "");
        setSlug(data.slug || "");
        setType(data.type || "prompt");
        setCategory(data.category || "video");
        setDescription(data.description || "");
        setDescriptionHtml(
          (data as { description_html?: string | null })
            .description_html || ""
        );
        setRelatedContent(
          (data as { related_content?: RelatedContentItem[] })
            .related_content || []
        );
        setPromptText(data.prompt || "");
        setMediaUrl(data.media_url || "");
        setAuthorName(data.author_name || "");
        setAiTools((data.ai_tools as string[]) || []);
        setIsFeatured(Boolean(data.is_featured));
        setIsTrending(Boolean(data.is_trending));
        setIsPublished(Boolean(data.is_published));
        setOriginalPublishedAt(
          (data as { published_at?: string | null })
            .published_at || null
        );
        setSeo(
          rowToSeoFields(
            data as unknown as Record<string, unknown>
          )
        );
        setMedia(
          rowToMediaFields(
            data as unknown as Record<string, unknown>
          )
        );
        setThumbnailUrl(
          (data as { thumbnail_url?: string | null })
            .thumbnail_url || ""
        );

        const keywordRows =
          (keywordsResponse.data || []) as unknown as KeywordLinkRow[];

        setKeywords(
          keywordRows
            .flatMap((row) =>
              Array.isArray(row.library_keywords)
                ? row.library_keywords
                : []
            )
            .map((keyword) => ({
              id: keyword.id,
              label: keyword.label,
            }))
        );

        setError("");
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load prompt:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load prompt."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPrompt();

    return () => {
      cancelled = true;
    };
  }, [promptId]);

  function toggleAiTool(tool: string) {
    setAiTools((current) =>
      current.includes(tool)
        ? current.filter((t) => t !== tool)
        : [...current, tool]
    );
  }

  async function handleSubmit(publish: boolean) {
    try {
      setSaving(true);
      setError("");

      const cleanTitle = title.trim();
      const cleanSlug = slug.trim() || generateSlug(cleanTitle);

      if (!cleanTitle) {
        throw new Error("Prompt title is required.");
      }

      const { error: updateError } = await supabase
        .from("library_items")
        .update({
          title: cleanTitle,
          slug: cleanSlug,
          type,
          category,
          description: description.trim() || null,
          description_html: descriptionHtml || null,
          related_content: relatedContent,
          prompt: promptText.trim() || null,
          media_type: deriveLegacyMediaType(media.source),
          media_url: mediaUrl.trim() || null,
          ai_tools: aiTools,
          author_name: authorName.trim() || null,
          is_featured: isFeatured,
          is_trending: isTrending,
          is_published: publish,
          published_at: publish
            ? originalPublishedAt ||
              new Date().toISOString()
            : null,
          ...seoFieldsToRow(seo),
          ...mediaFieldsToRow(media),
          thumbnail_url: thumbnailUrl.trim() || null,
        })
        .eq("id", promptId);

      if (updateError) {
        throw new Error(
          [
            "PROMPT UPDATE FAILED",
            `Code: ${updateError.code || "unknown"}`,
            `Message: ${updateError.message || "Unknown error"}`,
            `Details: ${updateError.details || "none"}`,
            `Hint: ${updateError.hint || "none"}`,
          ].join("\n")
        );
      }

      await saveLibraryItemKeywords(promptId, keywords);

      setIsPublished(publish);
      setOriginalPublishedAt(
        publish
          ? originalPublishedAt ||
            new Date().toISOString()
          : null
      );
      setSlug(cleanSlug);
      setError("");

      router.refresh();
    } catch (err) {
      console.error("Failed to update prompt:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update prompt."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this prompt? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("library_items")
        .delete()
        .eq("id", promptId);

      if (deleteError) {
        throw deleteError;
      }

      router.push("/admin/prompts");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete prompt:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete prompt."
      );

      setDeleting(false);
    }
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand";

  const textareaClass =
    "mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-brand";

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
          <div className="mt-8 h-64 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/prompts"
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← Back to Prompt Library
            </Link>

            <h1 className="mt-2 text-3xl font-bold">Edit Prompt</h1>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isPublished
                ? "bg-green-500/10 text-green-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-zinc-900 p-4">
            <p className="whitespace-pre-wrap text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Details</h2>

          <div className="mt-4 grid gap-5">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                URL Slug
              </label>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(generateSlug(e.target.value))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-600">
                aicheatbook.com/prompt/{slug || "..."}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                >
                  {PROMPT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={textareaClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Full Details{" "}
                <span className="text-zinc-600">
                  (optional, shown on the prompt's own page)
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
                excludeId={promptId}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Prompt Content
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
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
              <label className="text-sm font-medium text-zinc-300">
                Author Name{" "}
                <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">AI Tools</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {AI_TOOL_OPTIONS.map((tool) => {
              const selected = aiTools.includes(tool);

              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleAiTool(tool)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Keywords</h2>

          <div className="mt-4">
            <KeywordTagInput value={keywords} onChange={setKeywords} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Visibility</h2>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
              />
              Trending
            </label>
          </div>
        </section>

        <section className="mt-8">
          <SeoPanel
            seo={seo}
            onChange={setSeo}
            suggestedTitle={title}
            suggestedDescription={description}
            suggestedImageUrl={mediaUrl}
          />
        </section>

        <div className="mt-10 flex items-center justify-between border-t border-zinc-800 pt-6">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(false)}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(true)}
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish"}
            </button>
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded-xl border border-red-900/50 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Prompt"}
          </button>
        </div>
      </div>
    </main>
  );
}
