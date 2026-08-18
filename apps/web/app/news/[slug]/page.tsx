"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  getNewsItem,
  getNewsBlocks,
} from "@/lib/supabase/news";

import NewsBlockRenderer from "@/components/news/NewsBlockRenderer";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  author: string | null;
  published_at: string | null;
  is_published: boolean;
};

type NewsBlock = {
  id: string;
  news_id: string;
  block_type: string;
  sort_order: number;
  content: Record<string, unknown>;
};

type RelatedNews = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  category: string | null;
  published_at: string | null;
};

export default function NewsDetailPage() {
  const params = useParams();

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : "";

  const [news, setNews] =
    useState<NewsItem | null>(null);

  const [blocks, setBlocks] =
    useState<NewsBlock[]>([]);

  const [relatedNews, setRelatedNews] =
    useState<RelatedNews[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }

    async function loadNews() {
      try {
        setLoading(true);
        setError(null);

        const newsItem =
          await getNewsItem(slug);

        if (!newsItem) {
          setNews(null);
          setBlocks([]);
          setRelatedNews([]);
          return;
        }

        setNews(newsItem);

        const newsBlocks =
          await getNewsBlocks(newsItem.id);

        setBlocks(newsBlocks);

        /*
         * Load related published news.
         *
         * We intentionally fetch a small set
         * and filter the current article locally.
         */
        const { supabase } =
          await import(
            "@/lib/supabase/client"
          );

        const {
          data: relatedData,
          error: relatedError,
        } = await supabase
          .from("news")
          .select(
            `
              id,
              slug,
              title,
              cover_image_url,
              category,
              published_at
            `
          )
          .eq("is_published", true)
          .neq("id", newsItem.id)
          .order("published_at", {
            ascending: false,
          })
          .limit(3);

        if (!relatedError) {
          setRelatedNews(
            (relatedData ||
              []) as RelatedNews[]
          );
        }
      } catch (err) {
        console.error(
          "Failed to load news:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load news."
        );
      } finally {
        setLoading(false);
      }
    }

    loadNews();
  }, [slug]);

  /*
   * =========================
   * SHARE
   * =========================
   */

  async function handleShare() {
    try {
      const url =
        window.location.href;

      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            news?.title ||
            "AI News",
          text:
            news?.excerpt ||
            "",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      /*
       * User cancelling native share
       * should not show an error.
       */
      console.log(
        "Share cancelled:",
        err
      );
    }
  }

  /*
   * =========================
   * LOADING
   * =========================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">

        <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">

          <div className="h-5 w-36 animate-pulse rounded bg-zinc-800" />

          <div className="mt-8 h-4 w-24 animate-pulse rounded bg-zinc-900" />

          <div className="mt-4 h-12 w-full animate-pulse rounded bg-zinc-800 sm:h-16" />

          <div className="mt-4 h-12 w-4/5 animate-pulse rounded bg-zinc-900 sm:h-16" />

          <div className="mt-6 h-6 w-full animate-pulse rounded bg-zinc-900" />

          <div className="mt-10 aspect-video animate-pulse rounded-3xl bg-zinc-900" />

          <div className="mt-10 space-y-4">

            <div className="h-5 w-full animate-pulse rounded bg-zinc-900" />

            <div className="h-5 w-11/12 animate-pulse rounded bg-zinc-900" />

            <div className="h-5 w-10/12 animate-pulse rounded bg-zinc-900" />

          </div>

        </div>

      </main>
    );
  }

  /*
   * =========================
   * ERROR
   * =========================
   */

  if (error) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">

        <div className="mx-auto max-w-4xl rounded-3xl border border-red-900/50 bg-zinc-950 p-8 sm:p-10">

          <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
            AI News
          </p>

          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            Unable to load AI news
          </h1>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-500">
            {error}
          </p>

          <Link
            href="/news"
            className="mt-7 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            ← Back to AI News
          </Link>

        </div>

      </main>
    );
  }

  /*
   * =========================
   * NOT FOUND
   * =========================
   */

  if (!news) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">

        <div className="mx-auto max-w-4xl text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-2xl">
            📰
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            News not found
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-zinc-500">
            This news article does not exist or
            is not published yet.
          </p>

          <Link
            href="/news"
            className="mt-7 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            ← Back to AI News
          </Link>

        </div>

      </main>
    );
  }

  /*
   * =========================
   * PUBLIC ARTICLE
   * =========================
   */

  return (
    <main className="min-h-screen bg-black text-white">

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

            <button
              type="button"
              onClick={handleShare}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
            >
              <span>
                {copied
                  ? "✓"
                  : "↗"}
              </span>

              <span>
                {copied
                  ? "Copied"
                  : "Share"}
              </span>
            </button>

          </div>

        </header>

        {/* =================================
            COVER IMAGE
        ================================= */}

        {news.cover_image_url && (
          <div className="mx-auto mt-10 max-w-6xl px-4 sm:mt-12 sm:px-6">

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">

              <img
                src={
                  news.cover_image_url
                }
                alt={news.title}
                className="h-auto max-h-[680px] w-full object-cover"
              />

            </div>

          </div>
        )}

        {/* =================================
            CONTENT
        ================================= */}

        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">

          {blocks.length > 0 ? (
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

                    {/* Image */}

                    <div className="aspect-[16/9] overflow-hidden bg-zinc-900">

                      {item.cover_image_url ? (
                        <img
                          src={
                            item.cover_image_url
                          }
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