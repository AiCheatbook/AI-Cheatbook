"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type LearningCardItem = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
};

export default function AdminLearningCardsPage() {
  const [cards, setCards] = useState<
    LearningCardItem[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  async function loadCards() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("learning_cards")
        .select(`
          id,
          slug,
          title,
          category,
          thumbnail_url,
          cover_image_url,
          is_published,
          is_featured
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setCards(
        (data || []) as LearningCardItem[]
      );
    } catch (err) {
      console.error(
        "Failed to load learning cards:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load learning cards."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
              Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Learning Cards
            </h1>

            <p className="mt-2 text-zinc-600">
              Create and manage educational,
              Wikipedia-style articles.
            </p>
          </div>

          <Link
            href="/admin/learning-cards/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
          >
            + Create Learning Card
          </Link>
        </div>

        {/* ERROR */}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-900/50 bg-white p-6">
            <h2 className="font-semibold text-red-400">
              Unable to load learning cards
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadCards}
              className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 transition hover:bg-zinc-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white"
                />
              )
            )}
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          cards.length === 0 && (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-12 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">
                No learning cards yet
              </h2>

              <p className="mt-2 text-sm text-zinc-600">
                Create your first one.
              </p>

              <Link
                href="/admin/learning-cards/new"
                className="mt-5 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark"
              >
                Create Learning Card
              </Link>
            </div>
          )}

        {/* LIST */}

        {!loading &&
          !error &&
          cards.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[1fr_140px_150px] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-600 md:grid">
                <span>Learning Card</span>
                <span>Category</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-zinc-800">
                {cards.map((item) => {
                  const thumb =
                    item.thumbnail_url ||
                    item.cover_image_url;

                  return (
                    <div
                      key={item.id}
                      className="grid gap-4 px-5 py-5 transition hover:bg-white/50 md:grid-cols-[1fr_140px_150px] md:items-center"
                    >
                      <div className="flex min-w-0 gap-4">
                        <div className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                              None
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-zinc-900">
                            {item.title}
                          </h2>

                          <p className="mt-1 truncate text-sm text-zinc-600">
                            /learning/{item.slug}
                          </p>

                          {item.is_featured && (
                            <span className="mt-1 inline-block text-xs text-brand-text">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-zinc-600">
                        {item.category || "—"}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.is_published
                              ? "bg-green-500/10 text-green-400"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {item.is_published
                            ? "Published"
                            : "Draft"}
                        </span>

                        <Link
                          href={`/admin/learning-cards/${item.id}`}
                          className="text-sm font-medium text-brand-text transition hover:text-brand-text"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </main>
  );
}
