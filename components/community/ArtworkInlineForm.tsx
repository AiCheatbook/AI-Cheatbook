"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const YOUTUBE_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;

type ArtworkInlineFormProps = {
  onDone: () => void;
};

export default function ArtworkInlineForm({
  onDone,
}: ArtworkInlineFormProps) {
  const [method, setMethod] = useState<"upload" | "youtube">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Give your work a title.");
      return;
    }

    if (method === "upload" && !file) {
      setError("Choose a file to upload.");
      return;
    }

    if (
      method === "youtube" &&
      !YOUTUBE_PATTERN.test(youtubeUrl.trim())
    ) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        throw new Error("Please log in to submit your work.");
      }

      let mediaAssetId: string;

      if (method === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/artwork-upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Upload failed.");
        }

        mediaAssetId = result.mediaAssetId;
      } else {
        const { data: asset, error: assetError } = await supabaseAuthClient
          .from("media_assets")
          .insert({
            user_id: user.id,
            media_type: "youtube",
            storage_provider: "youtube",
            storage_path: youtubeUrl.trim(),
          })
          .select("id")
          .single();

        if (assetError || !asset) {
          throw new Error(
            assetError?.message || "Failed to save YouTube link."
          );
        }

        mediaAssetId = asset.id;
      }

      const { error: artworkError } = await supabaseAuthClient
        .from("community_artwork")
        .insert({
          user_id: user.id,
          media_asset_id: mediaAssetId,
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          status: "submitted",
        });

      if (artworkError) {
        throw new Error(artworkError.message);
      }

      onDone();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong submitting your work."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMethod("upload")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
            method === "upload"
              ? "border-brand bg-brand/10 text-brand-text"
              : "border-zinc-200 text-zinc-600"
          }`}
        >
          📤 Upload File
        </button>
        <button
          type="button"
          onClick={() => setMethod("youtube")}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
            method === "youtube"
              ? "border-brand bg-brand/10 text-brand-text"
              : "border-zinc-200 text-zinc-600"
          }`}
        >
          ▶️ YouTube Link
        </button>
      </div>

      {method === "upload" ? (
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 outline-none focus:border-brand"
        />
      ) : (
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give your work a title"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Tell us about it (optional)"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
      />

      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (optional) — e.g. Cinematic, Character Art, Music"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
      />

      <p className="text-xs text-zinc-500">
        Submissions are reviewed before appearing publicly.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit for Review"}
      </button>
    </form>
  );
}
