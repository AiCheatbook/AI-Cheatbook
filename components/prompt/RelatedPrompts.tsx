"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import PromptCard from "./PromptCard";

type RelatedPrompt = {
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
};

type RelatedPromptsProps = {
  currentSlug: string;
  category: string;
};

export default function RelatedPrompts({
  currentSlug,
  category,
}: RelatedPromptsProps) {
  const [related, setRelated] = useState<RelatedPrompt[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRelatedPrompts() {
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
            ai_tools
          `
        )
        .eq("category", category)
        .neq("slug", currentSlug)
        .order("sort_order", {
          ascending: true,
        })
        .limit(3);

      if (error) {
        console.error(
          "Failed to load related prompts:",
          error
        );

        setRelated([]);
        setLoading(false);

        return;
      }

      setRelated(
        (data || []).map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          type: item.type,
          category: item.category,
          description: item.description,
          media_type: item.media_type,
          media_url: item.media_url,
          media_source: item.media_source,
          thumbnail_url: item.thumbnail_url,
          ai_tools: Array.isArray(item.ai_tools)
            ? item.ai_tools
            : [],
        }))
      );

      setLoading(false);
    }

    loadRelatedPrompts();
  }, [currentSlug, category]);

  if (!loading && related.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 border-t border-zinc-800 pt-14">
      
      {/* Header */}

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          You May Also Like
        </p>

        <h2 className="mt-2 text-3xl font-bold text-white">
          🔥 Related Prompts
        </h2>

        <p className="mt-2 text-zinc-500">
          More prompts from the {category} category.
        </p>
      </div>

      {/* Loading */}

      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Related Prompts */}

      {!loading && related.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((prompt) => (
            <PromptCard
              key={prompt.id}
              slug={prompt.slug}
              title={prompt.title}
              type={prompt.type}
              category={prompt.category}
              description={prompt.description}
              mediaType={prompt.media_type}
              mediaUrl={prompt.media_url}
          mediaSource={prompt.media_source}
          thumbnailUrl={prompt.thumbnail_url}
              aiTools={prompt.ai_tools}
            />
          ))}
        </div>
      )}
    </section>
  );
}