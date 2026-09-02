"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type RatingRow = {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type RatingSectionProps = {
  libraryItemId: string;
};

function Stars({
  value,
  size = "text-lg",
}: {
  value: number;
  size?: string;
}) {
  return (
    <span className={size}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={
            n <= value
              ? "text-brand"
              : "text-zinc-700"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function RatingSection({
  libraryItemId,
}: RatingSectionProps) {
  const [ratings, setRatings] = useState<
    RatingRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);
  const [myRating, setMyRating] =
    useState(0);
  const [hoverRating, setHoverRating] =
    useState(0);
  const [reviewText, setReviewText] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [error, setError] = useState("");

  async function loadRatings() {
    setLoading(true);

    const { data, error } =
      await supabaseAuthClient
        .from("prompt_ratings")
        .select(
          `
            id,
            user_id,
            rating,
            review_text,
            created_at,
            profiles (
              display_name,
              email,
              avatar_url
            )
          `
        )
        .eq(
          "library_item_id",
          libraryItemId
        )
        .order("created_at", {
          ascending: false,
        });

    if (!error) {
      setRatings(
        (data ||
          []) as unknown as RatingRow[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      setCurrentUserId(
        user?.id || null
      );

      await loadRatings();

      if (user) {
        const { data: mine } =
          await supabaseAuthClient
            .from("prompt_ratings")
            .select(
              "rating, review_text"
            )
            .eq(
              "library_item_id",
              libraryItemId
            )
            .eq("user_id", user.id)
            .maybeSingle();

        if (mine) {
          setMyRating(mine.rating);
          setReviewText(
            mine.review_text || ""
          );
        }
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryItemId]);

  async function handleSubmit(
    stars: number
  ) {
    if (!currentUserId) {
      setError(
        "Please log in to rate this prompt."
      );
      return;
    }

    setError("");
    setSaving(true);
    setMyRating(stars);

    try {
      const { error: upsertError } =
        await supabaseAuthClient
          .from("prompt_ratings")
          .upsert(
            {
              library_item_id:
                libraryItemId,
              user_id: currentUserId,
              rating: stars,
              review_text:
                reviewText.trim() ||
                null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "library_item_id,user_id",
            }
          );

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }

      await loadRatings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save rating."
      );
    } finally {
      setSaving(false);
    }
  }

  const withReview = ratings.filter(
    (r) => r.review_text
  );

  const average =
    ratings.length > 0
      ? ratings.reduce(
          (sum, r) => sum + r.rating,
          0
        ) / ratings.length
      : 0;

  return (
    <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Ratings & Reviews
          </h2>

          {!loading &&
            ratings.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <Stars
                  value={Math.round(
                    average
                  )}
                />
                <span className="text-sm text-zinc-400">
                  {average.toFixed(1)}{" "}
                  ({ratings.length}{" "}
                  {ratings.length === 1
                    ? "rating"
                    : "ratings"}
                  )
                </span>
              </div>
            )}

          {!loading &&
            ratings.length === 0 && (
              <p className="mt-1 text-sm text-zinc-500">
                No ratings yet.
              </p>
            )}
        </div>
      </div>

      {currentUserId ? (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
          <p className="text-sm font-medium text-zinc-300">
            {myRating
              ? "Your rating"
              : "Rate this prompt"}
          </p>

          <div className="mt-2 flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={saving}
                onMouseEnter={() =>
                  setHoverRating(n)
                }
                onMouseLeave={() =>
                  setHoverRating(0)
                }
                onClick={() =>
                  handleSubmit(n)
                }
                className={
                  n <=
                  (hoverRating ||
                    myRating)
                    ? "text-brand"
                    : "text-zinc-700 hover:text-brand"
                }
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={reviewText}
            onChange={(e) =>
              setReviewText(
                e.target.value
              )
            }
            onBlur={() =>
              myRating &&
              handleSubmit(myRating)
            }
            rows={2}
            placeholder="Write a review (optional)..."
            className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand"
          />

          {error && (
            <p className="mt-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400">
          <a
            href="/login"
            className="text-brand hover:text-brand"
          >
            Log in
          </a>{" "}
          to rate and review this prompt.
        </p>
      )}

      {withReview.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
          {withReview.map((r) => {
            const authorName =
              r.profiles
                ?.display_name ||
              r.profiles?.email ||
              "Community Member";

            return (
              <div
                key={r.id}
                className="rounded-xl border border-zinc-800 bg-black p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {authorName}
                  </span>
                  <Stars
                    value={r.rating}
                    size="text-sm"
                  />
                </div>

                <p className="mt-1.5 text-sm text-zinc-400">
                  {r.review_text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
