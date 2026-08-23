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
  ai_tools: string[];
  keywords: string[];
};

export default function PromptSection() {
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
        .limit(3);

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

          const keywords = keywordRelations
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
                (
                  tool
                ): tool is string =>
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
    <section className="bg-black px-6 py-16">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-500">
            Popular Right Now
          </p>

          <h2 className="text-4xl font-bold text-white">
            🔥 Trending Prompts
          </h2>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Discover some of the most useful prompts
            from the AI Cheatbook library.
          </p>
        </div>

        {/* Loading */}

        {loading && (
          <div className="grid gap-8 md:grid-cols-3">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-125 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
                />
              )
            )}
          </div>
        )}

        {/* Trending Prompts */}

        {!loading &&
          trendingPrompts.length > 0 && (
            <div className="grid gap-8 md:grid-cols-3">
              {trendingPrompts.map(
                (prompt) => (
                  <PromptCard
                    key={prompt.id}
                    slug={prompt.slug}
                    title={prompt.title}
                    type={prompt.type}
                    category={prompt.category}
                    description={prompt.description}
                    mediaType={prompt.media_type}
                    mediaUrl={prompt.media_url}
                    aiTools={prompt.ai_tools}
                    keywords={prompt.keywords}
                  />
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