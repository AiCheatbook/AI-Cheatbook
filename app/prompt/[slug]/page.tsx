import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";

import { getLibraryItem } from "@/lib/supabase/library";
import RichContentRenderer from "@/components/cms/RichContentRenderer";
import RelatedContentSection from "@/components/cms/RelatedContentSection";
import CommentSection from "@/components/comments/CommentSection";
import RatingSection from "@/components/prompt/RatingSection";
import { buildContentMetadata } from "@/lib/seo/metadata";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildCreativeWorkSchema,
  buildBreadcrumbSchema,
} from "@/lib/seo/structuredData";

import PromptActions from "@/components/prompt/PromptActions";
import AddKeywordButton from "@/components/prompt/AddKeywordButton";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.hostname.includes("youtube.com")
    ) {
      const videoId =
        parsedUrl.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (
      parsedUrl.hostname === "youtu.be"
    ) {
      const videoId =
        parsedUrl.pathname.slice(1);

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const item = await getLibraryItem(slug);

  if (!item) {
    return {
      title: "Prompt not found",
      robots: { index: false, follow: false },
    };
  }

  return buildContentMetadata(
    item as Record<string, unknown>,
    `/prompt/${slug}`
  );
}

export default async function PromptDetailsPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const item = await getLibraryItem(slug);

  if (!item) {
    notFound();
  }

  /*
   * Extract keywords from Supabase relationship.
   */

  const keywords =
    item.library_item_keywords
      ?.sort(
        (
          a: {
            sort_order: number;
          },
          b: {
            sort_order: number;
          }
        ) =>
          a.sort_order -
          b.sort_order
      )
      .map(
        (itemKeyword: {
          library_keywords: {
            id: string;
            label: string;
            description?: string;
            category?: string;
          };
        }) =>
          itemKeyword.library_keywords
      )
      .filter(Boolean) || [];

  /*
   * PromptActions expects keyword labels.
   */

  const keywordLabels = keywords.map(
    (keyword: {
      label: string;
    }) => keyword.label
  );

  /*
   * Available AI tools.
   */

  const aiTools =
    Array.isArray(item.ai_tools)
      ? item.ai_tools
      : [];

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <JsonLd
        data={[
          buildCreativeWorkSchema(
            item as Record<string, unknown>,
            `/prompt/${slug}`
          ),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            {
              name: "Prompt Library",
              path: "/search",
            },
            {
              name: item.title,
              path: `/prompt/${slug}`,
            },
          ]),
        ]}
      />
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10">

        {/* Header */}

        <div className="max-w-4xl">

          <div className="flex flex-wrap gap-2">

            {item.type && (
              <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium capitalize text-brand">
                {item.type}
              </span>
            )}

            {item.category && (
              <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium capitalize text-zinc-400">
                {item.category}
              </span>
            )}

          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {item.title}
          </h1>

          {item.description && (
            <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
              {item.description}
            </p>
          )}

          {item.description_html && (
            <div className="mt-6 max-w-3xl">
              <RichContentRenderer
                html={item.description_html}
              />
            </div>
          )}

        </div>


        {/* Media */}

        {item.media_type &&
          item.media_url && (
            <section className="mt-10">

              {/* Image */}

              {item.media_type === "image" && (
                <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white">

                  <Image
                    src={item.media_url}
                    alt={item.title}
                    width={1200}
                    height={700}
                    priority
                    className="h-auto w-full object-cover"
                  />

                </div>
              )}


              {/* YouTube */}

              {item.media_type === "youtube" && (
                <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">

                  <div className="aspect-video">

                    <iframe
                      src={getYouTubeEmbedUrl(
                        item.media_url
                      )}
                      title={item.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />

                  </div>

                </div>
              )}


              {/* Hostinger Video */}

              {item.media_type === "hosted_video" && (
                <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">

                  <video
                    controls
                    preload="metadata"
                    className="h-auto w-full"
                  >
                    <source
                      src={item.media_url}
                      type="video/mp4"
                    />

                    Your browser does not
                    support the video tag.
                  </video>

                </div>
              )}

            </section>
          )}


        {/* Prompt */}

        {item.prompt && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <h2 className="text-xl font-semibold text-zinc-900">
                Prompt
              </h2>

              <span className="text-sm text-zinc-400">
                Ready to use
              </span>

            </div>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">

              <p className="whitespace-pre-line wrap-break-word text-base leading-8 text-zinc-400">
                {item.prompt}
              </p>

            </div>

          </section>
        )}


        {/* Actions */}

        {item.prompt && (
          <div className="mt-6">

            <PromptActions
              prompt={item.prompt}
              ingredients={keywordLabels}
            />

          </div>
        )}


        {/* Keywords */}

        {keywords.length > 0 && (
          <section className="mt-12">

            <h2 className="text-xl font-semibold text-zinc-900">
              Keywords
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Click the + button to add
              keywords directly to the
              Prompt Builder.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">

              {keywords.map(
                (keyword: {
                  id: string;
                  label: string;
                  description?: string;
                  category?: string;
                }) => (
                  <div
                    key={keyword.id}
                    className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white pl-4 pr-1 py-1 text-sm text-zinc-400"
                  >

                    <span>
                      {keyword.label}
                    </span>

                    <AddKeywordButton
                      keyword={keyword.label}
                    />

                  </div>
                )
              )}

            </div>

          </section>
        )}


        {/* Category */}

        {item.category && (
          <section className="mt-10">

            <p className="text-sm text-zinc-400">
              Category
            </p>

            <p className="mt-2 text-lg font-medium capitalize text-zinc-900">
              {item.category}
            </p>

          </section>
        )}


        {/* AI Tools */}

        {aiTools.length > 0 && (
          <section className="mt-10">

            <p className="text-sm text-zinc-400">
              Works With
            </p>

            <div className="mt-3 flex flex-wrap gap-2">

              {aiTools.map(
                (tool: string) => (
                  <span
                    key={tool}
                    className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-400"
                  >
                    {tool}
                  </span>
                )
              )}

            </div>

          </section>
        )}


        {/* Author */}

        {item.author_name && (
          <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6">

            <div className="mb-5">

              <h2 className="text-xl font-semibold text-zinc-900">
                Author
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                Prompt or concept created
                and verified by the
                community.
              </p>

            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-zinc-900">
                {item.author_name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>

                <h3 className="text-xl font-semibold text-zinc-900">
                  {item.author_name}
                </h3>

                {item.author_verified && (
                  <p className="mt-1 text-sm text-zinc-400">
                    ✓ Verified Creator
                  </p>
                )}

              </div>

            </div>

          </section>
        )}


        {/* Community Comments */}

        {item.library_comments &&
          item.library_comments.length > 0 && (
            <section className="mt-12">

              <h2 className="text-2xl font-semibold text-zinc-900">
                Community Comments
              </h2>

              <div className="mt-6 space-y-4">

                {item.library_comments.map(
                  (comment: {
                    id: string;
                    author_name: string;
                    comment: string;
                    comment_type?: string;
                  }) => (
                    <div
                      key={comment.id}
                      className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5"
                    >

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700 font-semibold text-zinc-900">
                        {comment.author_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>

                        <p className="font-medium text-zinc-900">
                          {comment.author_name}
                        </p>

                        <p className="mt-2 text-zinc-400">
                          {comment.comment}
                        </p>

                        {comment.comment_type && (
                          <p className="mt-2 text-sm capitalize text-brand">
                            {comment.comment_type}
                          </p>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>

            </section>
          )}

        <RelatedContentSection
          items={item.related_content || []}
        />

        <RatingSection
          libraryItemId={item.id}
        />

        <CommentSection
          contentType="prompt"
          contentId={item.id}
        />

      </div>
    </main>
  );
}