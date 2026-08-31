import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import {
  getNewsItem,
  getNewsBlocks,
} from "@/lib/supabase/news";
import NewsBlockRenderer from "@/components/news/NewsBlockRenderer";
import RichContentRenderer from "@/components/cms/RichContentRenderer";
import RelatedContentSection from "@/components/cms/RelatedContentSection";
import CommentSection from "@/components/comments/CommentSection";
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

type RelatedNews = {
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

/*
 * Per-page SEO metadata, built from the
 * SEO fields an editor filled in (with
 * automatic fallbacks to the article's
 * own title/excerpt/image).
 */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const news = await getNewsItem(slug);

  if (!news) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  return buildContentMetadata(
    news as Record<string, unknown>,
    `/news/${slug}`
  );
}

export default async function NewsDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const news = await getNewsItem(slug);

  if (!news) {
    notFound();
  }

  const blocks = await getNewsBlocks(
    news.id
  );

  const { data: relatedData } =
    await supabase
      .from("news")
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
      .neq("id", news.id)
      .order("published_at", {
        ascending: false,
      })
      .limit(3);

  const relatedNews = (relatedData ||
    []) as RelatedNews[];

  return (
    <main className="min-h-screen bg-black text-white">

      <JsonLd
        data={[
          buildArticleSchema(
            news as Record<string, unknown>,
            `/news/${slug}`,
            "Article"
          ),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "AI News", path: "/news" },
            {
              name: news.title,
              path: `/news/${slug}`,
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
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-white"
          >
            <span>←</span>
            <span>Back to AI News</span>
          </Link>

          {/* Category */}

          <div className="mt-10">

            {news.category && (
              <span className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
                {news.category}
              </span>
            )}

          </div>

          {/* Title */}

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {news.title}
          </h1>

          {/* Excerpt */}

          {news.excerpt && (
            <p className="mt-6 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              {news.excerpt}
            </p>
          )}

          {/* Meta */}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">

            {news.author && (
              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-400">
                  {news.author
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <span className="text-sm text-zinc-300">
                  {news.author}
                </span>

              </div>
            )}

            {news.published_at && (
              <>
                <span className="hidden text-zinc-700 sm:inline">
                  •
                </span>

                <time className="text-sm text-zinc-500">
                  {new Date(
                    news.published_at
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
                title={news.title}
                text={news.excerpt || ""}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
              />
            </div>

          </div>

        </header>

        {/* =================================
            COVER IMAGE
        ================================= */}

        {news.cover_image_url && (
          <div className="mx-auto mt-10 max-w-6xl px-4 sm:mt-12 sm:px-6">

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">

              {news.media_source === "youtube" ? (
                <div className="aspect-video">
                  <iframe
                    src={getYoutubeEmbedUrl(
                      news.cover_image_url
                    )}
                    title={news.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={resolveDisplayImageUrl(
                    news.cover_image_url,
                    news.media_source
                  )}
                  alt={news.title}
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

          {news.content_html ? (
            <RichContentRenderer
              html={news.content_html}
              showToc
            />
          ) : blocks.length > 0 ? (
            <NewsBlockRenderer
              blocks={blocks}
            />
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">

              <p className="text-zinc-500">
                This article has no content yet.
              </p>

            </div>
          )}

          <RelatedContentSection
            items={
              news.related_content || []
            }
          />

          <CommentSection
            contentType="news"
            contentId={news.id}
          />

        </div>

      </article>

      {/* =================================
          RELATED NEWS
      ================================= */}

      {relatedNews.length > 0 && (
        <section className="border-t border-zinc-900 bg-zinc-950/50">

          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">

            <div className="flex items-end justify-between gap-4">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                  Keep Reading
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  More AI News
                </h2>

              </div>

              <Link
                href="/news"
                className="hidden text-sm font-medium text-zinc-500 transition hover:text-white sm:block"
              >
                View All →
              </Link>

            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {relatedNews.map(
                (item) => (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
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
                href="/news"
                className="text-sm font-medium text-zinc-500 transition hover:text-white"
              >
                View All AI News →
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