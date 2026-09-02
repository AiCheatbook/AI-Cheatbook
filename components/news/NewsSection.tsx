"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import NewsCard from "./NewsCard";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
};

type NewsSectionProps = {
  headingLevel?: "h1" | "h2";
};

export default function NewsSection({
  headingLevel = "h2",
}: NewsSectionProps = {}) {
  const HeadingTag = headingLevel;
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadNews() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } =
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
              published_at
            `
          )
          .eq("is_published", true)
          .order("published_at", {
            ascending: false,
          })
          .limit(6);

      if (error) {
        console.error(
          "Failed to load news:",
          error
        );

        setNews([]);
        setErrorMessage(
          error.message
        );
        setLoading(false);

        return;
      }

      console.log(
        "NEWS FROM SUPABASE:",
        data
      );

      setNews(
        (data || []) as NewsItem[]
      );

      setLoading(false);
    }

    loadNews();
  }, []);

  return (
    <section className="bg-white px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* =========================
            HEADER
        ========================= */}

        <div className="mb-5">

          <p className="mb-0 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-orange-500">
            Stay Updated
          </p>

          <HeadingTag className="text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
            📰 Latest AI News
          </HeadingTag>

          <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-zinc-500">
            Keep up with the latest AI tools, models, features and updates.
          </p>

        </div>

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="aspect-4/5 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
              />
            ))}

          </div>
        )}

        {/* =========================
            ERROR
        ========================= */}

        {!loading &&
          errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10">

              <p className="text-lg font-semibold text-red-400">
                Unable to load AI news
              </p>

              <p className="mt-3 break-words text-sm text-zinc-500">
                {errorMessage}
              </p>

            </div>
          )}

        {/* =========================
            NEWS GRID
        ========================= */}

        {!loading &&
          !errorMessage &&
          news.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {news.map((item) => (
                <div
                  key={item.id}
                  className="w-full"
                >

                  <Link
                    href={`/news/${item.slug}`}
                    className="block"
                  >

                    <NewsCard
                      title={item.title}
                      image={
                        item.cover_image_url ||
                        "/news/news1.jpg"
                      }
                      mediaSource={
                        item.media_source
                      }
                      thumbnailUrl={
                        item.thumbnail_url
                      }
                    />

                  </Link>

                </div>
              ))}

            </div>
          )}

        {/* =========================
            EMPTY STATE
        ========================= */}

        {!loading &&
          !errorMessage &&
          news.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">

              <p className="text-zinc-500">
                No AI news available yet.
              </p>

            </div>
          )}

      </div>
    </section>
  );
}