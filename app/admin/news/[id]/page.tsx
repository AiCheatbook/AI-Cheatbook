"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SeoPanel from "@/components/cms/SeoPanel";
import {
  emptySeoFields,
  seoFieldsToRow,
  rowToSeoFields,
} from "@/lib/cms/seoFields";
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

import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

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
  sort_order: number;
};

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  author: string | null;
  cover_image_url: string | null;
  thumbnail_url?: string | null;
  is_published: boolean;
  content_html?: string | null;
  published_at: string | null;
};

function createBlock(type: BlockType): NewsBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "heading":
      return {
        id,
        block_type: type,
        content: { text: "" },
        sort_order: 0,
      };

    case "paragraph":
      return {
        id,
        block_type: type,
        content: { text: "" },
        sort_order: 0,
      };

    case "bullets":
    case "numbered_list":
      return {
        id,
        block_type: type,
        content: { items: [""] },
        sort_order: 0,
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
        sort_order: 0,
      };

    case "video":
      return {
        id,
        block_type: type,
        content: {
          url: "",
          caption: "",
        },
        sort_order: 0,
      };

    case "quote":
      return {
        id,
        block_type: type,
        content: {
          text: "",
          author: "",
        },
        sort_order: 0,
      };

    case "divider":
      return {
        id,
        block_type: type,
        content: {},
        sort_order: 0,
      };

    case "code":
      return {
        id,
        block_type: type,
        content: {
          code: "",
        },
        sort_order: 0,
      };

    default:
      return {
        id,
        block_type: "paragraph",
        content: { text: "" },
        sort_order: 0,
      };
  }
}

function blockLabel(type: BlockType) {
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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === "object") {
    const errorObject = err as Record<string, unknown>;

    const message =
      typeof errorObject.message === "string"
        ? errorObject.message
        : "";

    const code =
      typeof errorObject.code === "string"
        ? errorObject.code
        : "";

    const details =
      typeof errorObject.details === "string"
        ? errorObject.details
        : "";

    const hint =
      typeof errorObject.hint === "string"
        ? errorObject.hint
        : "";

    const parts: string[] = [];

    if (message) parts.push(`Message: ${message}`);
    if (code) parts.push(`Code: ${code}`);
    if (details) parts.push(`Details: ${details}`);
    if (hint) parts.push(`Hint: ${hint}`);

    if (parts.length > 0) {
      return parts.join("\n");
    }

    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return "Unknown error.";
    }
  }

  if (typeof err === "string") {
    return err;
  }

  return "Unknown error.";
}

export default function EditNewsPage() {
  const params = useParams();
  const router = useRouter();

  const newsId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [news, setNews] =
    useState<NewsItem | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
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

  const [isPublished, setIsPublished] =
    useState(false);

  const [blocks, setBlocks] =
    useState<NewsBlock[]>([]);

  const [contentHtml, setContentHtml] =
    useState("");
  const [relatedContent, setRelatedContent] =
    useState<RelatedContentItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * LOAD NEWS
   */

  useEffect(() => {
    if (!newsId) {
      return;
    }

    let cancelled = false;

    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const [
          newsResponse,
          blocksResponse,
        ] = await Promise.all([
          supabase
            .from("news")
            .select(`
              id,
              title,
              slug,
              excerpt,
              category,
              author,
              cover_image_url,
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
              thumbnail_url,
              content_html,
              related_content
            `)
            .eq("id", newsId)
            .single(),

          supabase
            .from("news_blocks")
            .select(`
              id,
              block_type,
              content,
              sort_order
            `)
            .eq("news_id", newsId)
            .order("sort_order", {
              ascending: true,
            }),
        ]);

        if (cancelled) {
          return;
        }

        if (newsResponse.error) {
          throw newsResponse.error;
        }

        if (!newsResponse.data) {
          throw new Error(
            "News article not found."
          );
        }

        if (blocksResponse.error) {
          throw blocksResponse.error;
        }

        const newsData =
          newsResponse.data as NewsItem;

        const blockData =
          (blocksResponse.data || [])
            .map((block) => ({
              ...block,
              content:
                block.content &&
                typeof block.content === "object"
                  ? block.content
                  : {},
            })) as NewsBlock[];

        setNews(newsData);
        setTitle(newsData.title || "");
        setSlug(newsData.slug || "");
        setExcerpt(newsData.excerpt || "");
        setCategory(newsData.category || "");
        setAuthor(newsData.author || "");
        setCoverImage(
          newsData.cover_image_url || ""
        );
        setIsPublished(
          Boolean(newsData.is_published)
        );
        setSeo(
          rowToSeoFields(
            newsData as unknown as Record<
              string,
              unknown
            >
          )
        );
        setMedia(
          rowToMediaFields(
            newsData as unknown as Record<
              string,
              unknown
            >
          )
        );
        setThumbnailUrl(
          newsData.thumbnail_url || ""
        );
        setBlocks(blockData);
        setContentHtml(
          newsData.content_html || ""
        );
        setRelatedContent(
          (newsData as { related_content?: RelatedContentItem[] })
            .related_content || []
        );
        setError("");
      } catch (err) {
        console.error(
          "FAILED TO LOAD NEWS:",
          err
        );

        if (!cancelled) {
          setError(
            getErrorMessage(err)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [newsId]);

  /*
   * PREVIEW
   *
   * Important:
   * Preview does NOT save anything to Supabase.
   * It sends the current editor state to the
   * preview page through sessionStorage.
   */

  function handlePreview() {
    try {
      if (!newsId) {
        setError("Invalid news ID.");
        return;
      }

      const previewNews: NewsItem = {
        id: newsId,
        title: title,
        slug: slug,
        excerpt: excerpt.trim() || null,
        category: category.trim() || null,
        author: author.trim() || null,
        cover_image_url:
          coverImage.trim() || null,
        is_published: isPublished,
        published_at:
          news?.published_at || null,
      };

      const previewData = {
        news: previewNews,
        blocks: blocks.map(
          (block, index) => ({
            ...block,
            sort_order: index + 1,
          })
        ),
      };

      sessionStorage.setItem(
        "ai-cheatbook-news-preview",
        JSON.stringify(previewData)
      );

      window.open(
        `/admin/news/${newsId}/preview`,
        "_blank"
      );
    } catch (err) {
      console.error(
        "PREVIEW ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open preview."
      );
    }
  }

  /*
   * UPDATE BLOCK FIELD
   */

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

  /*
   * UPDATE LIST ITEM
   */

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

  /*
   * ADD LIST ITEM
   */

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

  /*
   * REMOVE LIST ITEM
   */

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

  /*
   * ADD BLOCK
   */

  function addBlock(type: BlockType) {
    setBlocks((current) => [
      ...current,
      {
        ...createBlock(type),
        sort_order:
          current.length + 1,
      },
    ]);
  }

  /*
   * REMOVE BLOCK
   */

  function removeBlock(id: string) {
    setBlocks((current) =>
      current
        .filter(
          (block) => block.id !== id
        )
        .map((block, index) => ({
          ...block,
          sort_order: index + 1,
        }))
    );
  }

  /*
   * MOVE BLOCK
   */

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

      next[index] =
        next[targetIndex];

      next[targetIndex] = temp;

      return next.map(
        (block, blockIndex) => ({
          ...block,
          sort_order:
            blockIndex + 1,
        })
      );
    });
  }

  /*
   * DELETE NEWS
   */

  async function handleDeleteNews() {
    if (!newsId || !news) {
      setError("Invalid news ID.");
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to permanently delete "${news.title}"?\n\nThis will delete the article and all of its content blocks.`
      );

    if (!confirmed) return;
    if (saving) return;

    try {
      setSaving(true);
      setError("");

      const {
        error: blocksError,
      } = await supabase
        .from("news_blocks")
        .delete()
        .eq("news_id", newsId);

      if (blocksError) {
        throw new Error(
          [
            "NEWS BLOCK DELETE FAILED",
            `Code: ${
              blocksError.code ||
              "unknown"
            }`,
            `Message: ${
              blocksError.message ||
              "unknown"
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

      const {
        error: newsError,
      } = await supabase
        .from("news")
        .delete()
        .eq("id", newsId);

      if (newsError) {
        throw new Error(
          [
            "NEWS DELETE FAILED",
            `Code: ${
              newsError.code ||
              "unknown"
            }`,
            `Message: ${
              newsError.message ||
              "unknown"
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

      router.replace(
        "/admin/news"
      );

      router.refresh();
    } catch (err) {
      console.error(
        "FINAL DELETE ERROR:",
        err
      );

      setError(
        `Unable to delete news.\n\n${getErrorMessage(
          err
        )}`
      );

      setSaving(false);
    }
  }

  /*
   * SAVE NEWS
   */

  async function handleSave(
    publish?: boolean
  ) {
    if (!newsId) {
      setError("Invalid news ID.");
      return;
    }

    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const cleanTitle =
        title.trim();

      const cleanSlug =
        slug.trim();

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

      const finalPublished =
        typeof publish === "boolean"
          ? publish
          : isPublished;

      const finalPublishedAt =
        finalPublished
          ? news?.published_at ||
            new Date().toISOString()
          : null;

      /*
       * STEP 1
       * UPDATE NEWS
       */

      const updateData = {
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
        is_published:
          finalPublished,
        published_at:
          finalPublishedAt,
        ...seoFieldsToRow(seo),
        ...mediaFieldsToRow(media),
        thumbnail_url:
          thumbnailUrl.trim() || null,
        content_html: contentHtml,
        related_content: relatedContent,
      };

      console.log(
        "STEP 1: Updating news",
        {
          newsId,
          updateData,
        }
      );

      const {
        error: newsError,
      } = await supabase
        .from("news")
        .update(updateData)
        .eq("id", newsId);

      if (newsError) {
        console.error(
          "NEWS UPDATE ERROR:",
          newsError
        );

        throw new Error(
          [
            "NEWS UPDATE FAILED",
            `Message: ${
              newsError.message ||
              "Unknown Supabase error."
            }`,
            `Code: ${
              newsError.code ||
              "No error code."
            }`,
            `Details: ${
              newsError.details ||
              "No details."
            }`,
            `Hint: ${
              newsError.hint ||
              "No hint."
            }`,
          ].join("\n")
        );
      }

      /*
       * STEP 4
       * UPDATE LOCAL STATE
       */

      const savedNews: NewsItem = {
        id: newsId,
        title: updateData.title,
        slug: updateData.slug,
        excerpt:
          updateData.excerpt,
        category:
          updateData.category,
        author:
          updateData.author,
        cover_image_url:
          updateData.cover_image_url,
        is_published:
          updateData.is_published,
        published_at:
          updateData.published_at,
      };

      setNews(savedNews);

      setIsPublished(
        finalPublished
      );

      setError("");

      /*
       * STEP 5
       * REDIRECT
       */

      router.replace(
        "/admin/news"
      );

      router.refresh();
    } catch (err) {
      console.error(
        "FINAL SAVE ERROR:",
        err
      );

      const message =
        getErrorMessage(err);

      setError(
        `Unable to save news.\n\n${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * LOADING
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-32 rounded bg-zinc-900" />
            <div className="h-10 w-72 rounded bg-zinc-900" />
            <div className="h-5 w-96 rounded bg-zinc-900" />
            <div className="h-64 rounded-2xl bg-zinc-900" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * ERROR WHILE LOADING
   */

  if (error && !news) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/admin/news"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Back to News
          </Link>

          <div className="mt-8 rounded-2xl border border-red-900/50 bg-red-950/20 p-8">
            <h1 className="text-xl font-semibold text-red-400">
              Unable to load news
            </h1>

            <p className="mt-3 whitespace-pre-wrap text-sm text-red-300/80">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * PAGE
   */

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Header */}

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
              Edit News
            </h1>

            <p className="mt-2 text-zinc-400">
              Edit the article and manage its
              content blocks.
            </p>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
            <p className="font-medium text-red-400">
              Unable to save news
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-300/80">
              {error}
            </p>
          </div>
        )}

        {/* News Information */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold">
            News Information
          </h2>

          <div className="mt-6 space-y-5">

            {/* Title */}

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Title
              </label>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            {/* Slug */}

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Slug
              </label>

              <input
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
              />
            </div>

            {/* Category + Author */}

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Category
                </label>

                <input
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-300">
                  Author
                </label>

                <input
                  value={author}
                  onChange={(event) =>
                    setAuthor(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />
              </div>

            </div>

            {/* Excerpt */}

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Excerpt
              </label>

              <textarea
                value={excerpt}
                onChange={(event) =>
                  setExcerpt(
                    event.target.value
                  )
                }
                rows={4}
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500"
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

        {/* SEO & Social Media */}

        <section className="mt-8">
          <SeoPanel
            seo={seo}
            onChange={setSeo}
            suggestedTitle={title}
            suggestedDescription={excerpt}
            suggestedImageUrl={coverImage}
          />
        </section>

        {/* Content */}

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
              placeholder="Start writing your article..."
            />
          </div>
        </section>

        {/* Related Content */}

        <section className="mt-8">
          <RelatedContentPicker
            value={relatedContent}
            onChange={setRelatedContent}
            excludeId={newsId}
          />
        </section>


        {/* Actions */}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <label className="flex items-center gap-3 text-sm text-zinc-400">

              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) =>
                  setIsPublished(
                    event.target.checked
                  )
                }
                disabled={saving}
                className="h-4 w-4 accent-orange-500"
              />

              Published

            </label>

            <div className="flex flex-wrap gap-3">

              {/* Cancel */}

              <Link
                href="/admin/news"
                className="rounded-xl border border-zinc-800 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                Cancel
              </Link>

              {/* PREVIEW */}

              <button
                type="button"
                onClick={handlePreview}
                disabled={saving}
                className="rounded-xl border border-orange-500/50 bg-orange-500/10 px-5 py-3 text-sm font-semibold text-orange-400 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Preview
              </button>

              {/* SAVE */}

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSave()
                }
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              {/* DELETE */}

              <button
                type="button"
                disabled={saving}
                onClick={
                  handleDeleteNews
                }
                className="rounded-xl border border-red-900/60 bg-red-950/10 px-5 py-3 text-sm font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Deleting..."
                  : "Delete News"}
              </button>

              {/* PUBLISH */}

              {!isPublished && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    handleSave(true)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Publishing..."
                    : "Publish News"}
                </button>
              )}

              {/* UPDATE */}

              {isPublished && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    handleSave(true)
                  }
                  className="rounded-xl border border-orange-500/50 px-5 py-3 text-sm font-semibold text-orange-400 transition hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Updating..."
                    : "Update News"}
                </button>
              )}

            </div>
          </div>
        </section>

      </div>
    </main>
  );
}