import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import {
  getLearningCardItem,
  getLearningCardBlocks,
} from "@/lib/supabase/learningCards";
import LearningCardBlockRenderer from "@/components/learning-cards/LearningCardBlockRenderer";
import RichContentRenderer from "@/components/cms/RichContentRenderer";
import ShareButton from "@/components/shared/ShareButton";
import {
  resolveDisplayImageUrl,
  resolveThumbnailUrl,
  getYoutubeEmbedUrl,
} from "@/lib/cms/mediaDisplay";
import { buildContentMetadata } from "@/lib/seo/metadata";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
} from "@/lib/seo/structuredData";

type RelatedLearningCard = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
  category: string | null;
  published_at: string | null;
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const card =
    await getLearningCardItem(slug);

  if (!card) {
    return {
      title: "Learning card not found",
      robots: { index: false, follow: false },
    };
  }

  return buildContentMetadata(
    card as Record<string, unknown>,
    `/learning/${slug}`
  );
}

export default async function LearningCardDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const card =
    await getLearningCardItem(slug);

  if (!card) {
    notFound();
  }

  const blocks =
    await getLearningCardBlocks(card.id);

  const { data: relatedData } =
    await supabase
      .from("learning_cards")
      .select(
        `
          id,
          slug,
          title,
          cover_image_url,
          media_source,
          thumbnail_url,
          category,
          published_at
        `
      )
      .eq("is_published", true)
      .neq("id", card.id)
      .order("published_at", {
        ascending: false,
      })
      .limit(3);

  const relatedCards = (relatedData ||
    []) as RelatedLearningCard[];

  return (
    <main className="min-h-screen bg-black text-white">

      <JsonLd
        data={[
          buildArticleSchema(
            card as Record<string, unknown>,
            `/learning/${slug}`,
            "TechArticle"
          ),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            {
              name: "Learning Cards",
              path: "/learning",
            },
            {
              name: card.title,
              path: `/learning/${slug}`,
            },
          ]),
        ]}
      />

      {/* =================================
          ARTICLE HEADER
      ================================= */}

      <article>

        <header className="mx-auto max-w-5xl px-6 pt-8 sm:pt-12">

          {/* Back */}

          <Link
            href="/learning"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <span>←</span>
            <span>Back to Learning Cards</span>
          </Link>

          {/* Category */}

          <div className="mt-10">

            {card.category && (
              <span className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
                {card.category}
              </span>
            )}

          </div>

          {/* Title */}

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {card.title}
          </h1>

          {/* Summary */}

          {card.summary && (
            <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              {card.summary}
            </p>
          )}

          {/* Meta */}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">

            {card.author && (
              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-400">
                  {card.author
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <span className="text-sm text-zinc-300">
                  {card.author}
                </span>

              </div>
            )}

            {card.published_at && (
              <>
                <span className="hidden text-zinc-700 sm:inline">
                  •
                </span>

                <time className="text-sm text-zinc-500">
                  {new Date(
                    card.published_at
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </time>
              </>
            )}

            {/* Share */}

            <div className="ml-auto">
              <ShareButton
                title={card.title}
                text={card.summary || ""}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              />
            </div>

          </div>

        </header>

        {/* =================================
            COVER IMAGE
        ================================= */}

        {card.cover_image_url && (
          <div className="mx-auto mt-10 max-w-6xl px-4 sm:mt-12 sm:px-6">

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">

              {card.media_source === "youtube" ? (
                <div className="aspect-video">
                  <iframe
                    src={getYoutubeEmbedUrl(
                      card.cover_image_url
                    )}
                    title={card.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={resolveDisplayImageUrl(
                    card.cover_image_url,
                    card.media_source
                  )}
                  alt={card.title}
                  className="h-auto max-h-[680px] w-full object-cover"
                />
              )}

            </div>

          </div>
        )}

        {/* =================================
            CONTENT
        ================================= */}

        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">

          {card.content_html ? (
            <RichContentRenderer
              html={card.content_html}
              showToc
            />
          ) : blocks.length > 0 ? (
            <LearningCardBlockRenderer
              blocks={blocks}
            />
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">

              <p className="text-zinc-500">
                This article has no content yet.
              </p>

            </div>
          )}

        </div>

      </article>

      {/* =================================
          RELATED NEWS
      ================================= */}

      {relatedCards.length > 0 && (
        <section className="border-t border-zinc-900 bg-zinc-950/50">

          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">

            <div className="flex items-end justify-between gap-4">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                  Keep Reading
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  More Learning Cards
                </h2>

              </div>

              <Link
                href="/learning"
                className="hidden text-sm font-medium text-zinc-500 transition hover:text-white sm:block"
              >
                View All →
              </Link>

            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {relatedCards.map(
                (item) => (
                  <Link
                    key={item.id}
                    href={`/learning/${item.slug}`}
                    className="group overflow-hidden rounded-2xl border border-zinc-800 bg-black transition hover:-translate-y-1 hover:border-zinc-700"
                  >

                    {/* Thumbnail (always 4:5) */}

                    <div className="aspect-[4/5] overflow-hidden bg-zinc-900">

                      {(item.thumbnail_url || item.cover_image_url) ? (
                        <img
                          src={resolveThumbnailUrl(
                            item.thumbnail_url,
                            item.cover_image_url,
                            item.media_source
                          )}
                          alt={
                            item.title
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          📰
                        </div>
                      )}

                    </div>

                    {/* Content */}

                    <div className="p-5">

                      {item.category && (
                        <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                          {
                            item.category
                          }
                        </p>
                      )}

                      <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white transition group-hover:text-orange-400">
                        {item.title}
                      </h3>

                      {item.published_at && (
                        <p className="mt-3 text-xs text-zinc-600">
                          {new Date(
                            item.published_at
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      )}

                    </div>

                  </Link>
                )
              )}

            </div>

            {/* Mobile View All */}

            <div className="mt-6 sm:hidden">

              <Link
                href="/learning"
                className="text-sm font-medium text-zinc-500 transition hover:text-white"
              >
                View All Learning Cards →
              </Link>

            </div>

          </div>

        </section>
      )}

      {/* =================================
          FOOTER SPACE
      ================================= */}

      <div className="h-10 bg-black" />

    </main>
  );
}