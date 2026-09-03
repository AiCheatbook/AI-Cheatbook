"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

const YOUTUBE_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;

export default function SubmitArtworkPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [method, setMethod] = useState<
    "upload" | "youtube"
  >("upload");

  const [file, setFile] =
    useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] =
    useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/submit/artwork"
        );
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (selected.size > MAX_SIZE_BYTES) {
      setError(
        "File is larger than the 100MB limit."
      );
      return;
    }

    setError("");
    setFile(selected);
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please add a title.");
      return;
    }

    if (
      method === "upload" &&
      !file
    ) {
      setError(
        "Please choose a file to upload."
      );
      return;
    }

    if (
      method === "youtube" &&
      !YOUTUBE_PATTERN.test(
        youtubeUrl.trim()
      )
    ) {
      setError(
        "Please enter a valid YouTube URL."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setError(
          "Please log in to submit artwork."
        );
        setSubmitting(false);
        return;
      }

      let mediaAssetId: string;

      if (method === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          "/api/artwork-upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const result =
          await response.json();

        if (!result.success) {
          throw new Error(
            result.error ||
              "Upload failed."
          );
        }

        mediaAssetId =
          result.mediaAssetId;
      } else {
        const { data: asset, error: assetError } =
          await supabaseAuthClient
            .from("media_assets")
            .insert({
              user_id: user.id,
              media_type: "youtube",
              storage_provider:
                "youtube",
              storage_path:
                youtubeUrl.trim(),
            })
            .select("id")
            .single();

        if (assetError || !asset) {
          throw new Error(
            assetError?.message ||
              "Failed to save YouTube link."
          );
        }

        mediaAssetId = asset.id;
      }

      const { error: artworkError } =
        await supabaseAuthClient
          .from("community_artwork")
          .insert({
            user_id: user.id,
            media_asset_id: mediaAssetId,
            title: title.trim(),
            description:
              description.trim() ||
              null,
            category:
              category.trim() || null,
            status: "submitted",
          });

      if (artworkError) {
        throw new Error(
          artworkError.message
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Submission failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return null;
  }

  if (success) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-center text-zinc-900">
        <div className="mx-auto max-w-md">
          <div className="text-4xl">
            🎨
          </div>
          <h1 className="mt-4 text-xl font-bold">
            Artwork submitted!
          </h1>
          <p className="mt-2 text-zinc-600">
            Your submission is now under
            review. You&apos;ll be notified
            once it&apos;s approved and
            published.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">
          🎨 Submit Artwork
        </h1>
        <p className="mt-1 text-zinc-600">
          Share your AI-generated images,
          video, or audio with the
          community. Submissions are
          reviewed before appearing
          publicly.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setMethod("upload")
              }
              className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                method === "upload"
                  ? "border-brand bg-brand text-zinc-900"
                  : "border-zinc-300 text-zinc-600"
              }`}
            >
              Upload File
            </button>

            <button
              type="button"
              onClick={() =>
                setMethod("youtube")
              }
              className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                method === "youtube"
                  ? "border-brand bg-brand text-zinc-900"
                  : "border-zinc-300 text-zinc-600"
              }`}
            >
              YouTube URL
            </button>
          </div>

          {method === "upload" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                File (images, video, or
                audio — max 100MB)
              </label>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg"
                onChange={
                  handleFileChange
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              {file && (
                <p className="mt-1 text-xs text-zinc-500">
                  {file.name} (
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(1)}
                  MB)
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                YouTube URL
              </label>
              <input
                value={youtubeUrl}
                onChange={(e) =>
                  setYoutubeUrl(
                    e.target.value
                  )
                }
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Title
            </label>
            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              rows={3}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Category (optional)
            </label>
            <input
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              placeholder="e.g. Cinematic, Character Art, Music"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit for Review"}
          </button>
        </form>
      </div>
    </main>
  );
}
