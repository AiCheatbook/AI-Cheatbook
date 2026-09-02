"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import PromptCard from "./PromptCard";

type TrendingKeyword = {
  sort_order: number;
  library_keywords:
    | {
        label: string;
      }[]
    | null;
};

type TrendingPrompt = {
  id: string;
  slug: string;
  title: string;
  type: string;
  category: string;
  description: string;
  media_type: string | null;
  media_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
  ai_tools: string[];
  keywords: string[];
};

export default function TrendingPrompts() {
  const [trendingPrompts, setTrendingPrompts] =
    useState<TrendingPrompt[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrendingPrompts() {
      setLoading(true);

      const { data, error } = await supabase
        .from("library_items")
        .select(
          `
            id,
            slug,
            title,
            type,
            category,
            description,
            media_type,
            media_url,
            media_source,
            thumbnail_url,
            ai_tools,
            library_item_keywords (
              sort_order,
              library_keywords (
                label
              )
            )
          `
        )
        .eq("is_trending", true)
        .order("sort_order", {
          ascending: true,
        })
        .limit(6);

      if (error) {
        console.error(
          "Failed to load trending prompts:",
          error
        );

        setTrendingPrompts([]);
        setLoading(false);

        return;
      }

      const formattedPrompts: TrendingPrompt[] =
        (data || []).map((item) => {
          const keywordRelations =
            Array.isArray(item.library_item_keywords)
              ? (item.library_item_keywords as TrendingKeyword[])
              : [];

          const keywords = [...keywordRelations]
            .sort(
              (a, b) =>
                a.sort_order - b.sort_order
            )
            .flatMap((itemKeyword) => {
              if (
                !Array.isArray(
                  itemKeyword.library_keywords
                )
              ) {
                return [];
              }

              return itemKeyword.library_keywords
                .map(
                  (keyword) => keyword?.label
                )
                .filter(
                  (
                    keyword
                  ): keyword is string =>
                    typeof keyword === "string" &&
                    keyword.trim().length > 0
                );
            });

          const aiTools = Array.isArray(
            item.ai_tools
          )
            ? item.ai_tools.filter(
                (tool): tool is string =>
                  typeof tool === "string" &&
                  tool.trim().length > 0
              )
            : [];

          return {
            id: item.id,
            slug: item.slug,
            title: item.title,
            type: item.type,
            category: item.category || "",
            description: item.description || "",
            media_type: item.media_type,
            media_url: item.media_url,
            media_source: item.media_source,
            thumbnail_url: item.thumbnail_url,
            ai_tools: aiTools,
            keywords,
          };
        });

      setTrendingPrompts(formattedPrompts);
      setLoading(false);
    }

    loadTrendingPrompts();
  }, []);

  return (
    <section className="bg-zinc-950 px-6 py-6 sm:py-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mb-4">

          {/* Section Label */}

          <p className="mb-0 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-brand">
            Popular Right Now
          </p>

          {/* Heading */}

          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            🔥 Trending Prompts
          </h2>

          {/* Description */}

          <p className="mt-1 whitespace-nowrap overflow-hidden text-ellipsis text-zinc-400">
            Explore popular AI prompts created for writing, marketing, content creation and more.
          </p>

        </div>

        {/* Loading */}

        {loading && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="aspect-4/5 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
                />
              )
            )}
          </div>
        )}

        {/* Trending Grid */}

        {!loading &&
          trendingPrompts.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] justify-items-center gap-4">
              {trendingPrompts.map(
                (prompt) => (
                  <div
                    key={prompt.id}
                    className="w-full max-w-60"
                  >
                    <PromptCard
                      slug={prompt.slug}
                      title={prompt.title}
                      type={prompt.type}
                      category={prompt.category}
                      description={prompt.description}
                      mediaUrl={prompt.media_url}
                      mediaSource={prompt.media_source}
                      thumbnailUrl={prompt.thumbnail_url}
                      aiTools={prompt.ai_tools}
                      keywords={prompt.keywords}
                    />
                  </div>
                )
              )}
            </div>
          )}

        {/* Empty State */}

        {!loading &&
          trendingPrompts.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400">
                No trending prompts available yet.
              </p>
            </div>
          )}

      </div>
    </section>
  );
}