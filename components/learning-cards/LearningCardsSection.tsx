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

export default function LearningCardsSection() {
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
        })
        .limit(6);

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

  /*
   * Nothing published yet and nothing
   * failed loudly — quietly hide this
   * section rather than show an empty
   * block on the homepage.
   */

  if (
    !loading &&
    !errorMessage &&
    cards.length === 0
  ) {
    return null;
  }

  return (
    <section className="bg-white px-6 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
              Learn AI
            </h2>

            <p className="mt-1 text-zinc-600">
              Clear, structured explanations
              of AI concepts, tools, and
              techniques.
            </p>
          </div>

          <Link
            href="/learning"
            className="hidden shrink-0 text-sm font-medium text-brand-text transition hover:text-brand-text-hover sm:block"
          >
            View All →
          </Link>
        </div>

        {/* LOADING */}

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

        {/* ERROR */}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
            <p className="text-lg font-semibold text-red-600">
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
              {cards.map((item, index) => (
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
                    priority={index === 0}
                  />
                </Link>
              ))}
            </div>
          )}

        {/* Mobile "View All" */}

        {!loading &&
          !errorMessage &&
          cards.length > 0 && (
            <div className="mt-5 sm:hidden">
              <Link
                href="/learning"
                className="block rounded-xl border border-zinc-200 py-3 text-center text-sm font-medium text-brand-text"
              >
                View All Learning Cards →
              </Link>
            </div>
          )}

      </div>
    </section>
  );
}
