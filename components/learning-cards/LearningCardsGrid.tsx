"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import LearningCardCard from "./LearningCardCard";

type LearningCardItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  cover_image_url: string | null;
  media_source: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
};

export default function LearningCardsGrid() {
  const [cards, setCards] = useState<
    LearningCardItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("learning_cards")
        .select(
          `
            id,
            slug,
            title,
            summary,
            category,
            cover_image_url,
            media_source,
            thumbnail_url,
            published_at
          `
        )
        .eq("is_published", true)
        .order("published_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Failed to load learning cards:",
          error
        );

        setCards([]);
        setErrorMessage(error.message);
        setLoading(false);

        return;
      }

      setCards(
        (data ||
          []) as LearningCardItem[]
      );

      setLoading(false);
    }

    loadCards();
  }, []);

  return (
    <section className="bg-white px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-5">
          <p className="mb-0 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-brand-text">
            Learn AI
          </p>

          <h1 className="text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
            📚 Learning Cards
          </h1>

          <p className="mt-1 text-zinc-600">
            Clear, structured explanations of
            AI concepts, tools, and
            techniques.
          </p>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="aspect-4/5 animate-pulse rounded-2xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* ERROR */}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-900/50 bg-white p-10">
            <p className="text-lg font-semibold text-red-400">
              Unable to load learning cards
            </p>

            <p className="mt-3 break-words text-sm text-zinc-600">
              {errorMessage}
            </p>
          </div>
        )}

        {/* GRID */}

        {!loading &&
          !errorMessage &&
          cards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((item) => (
                <Link
                  key={item.id}
                  href={`/learning/${item.slug}`}
                  className="block"
                >
                  <LearningCardCard
                    title={item.title}
                    summary={item.summary}
                    category={item.category}
                    coverImage={
                      item.cover_image_url
                    }
                    mediaSource={
                      item.media_source
                    }
                    thumbnailUrl={
                      item.thumbnail_url
                    }
                  />
                </Link>
              ))}
            </div>
          )}

        {/* EMPTY */}

        {!loading &&
          !errorMessage &&
          cards.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
              <p className="text-zinc-600">
                No learning cards available
                yet.
              </p>
            </div>
          )}

      </div>
    </section>
  );
}
