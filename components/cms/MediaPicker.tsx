"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import type {
  MediaFields,
  MediaSource,
  MediaAspectRatio,
} from "@/lib/cms/mediaFields";

type MediaPickerProps = {
  media: MediaFields;
  onMediaChange: (next: MediaFields) => void;

  url: string;
  onUrlChange: (next: string) => void;

  label?: string;
};

const SOURCE_OPTIONS: {
  value: MediaSource;
  label: string;
}[] = [
  { value: "", label: "Select a source" },
  { value: "youtube", label: "YouTube" },
  {
    value: "hostinger",
    label: "Hostinger (upload)",
  },
  {
    value: "supabase_storage",
    label: "Supabase Storage (upload)",
  },
];

const ASPECT_RATIO_OPTIONS: {
  value: MediaAspectRatio;
  label: string;
}[] = [
  {
    value: "",
    label: "Select aspect ratio",
  },
  { value: "16:9", label: "16:9 — Landscape" },
  { value: "9:16", label: "9:16 — Vertical" },
  { value: "4:5", label: "4:5 — Portrait" },
];

const SUPABASE_MEDIA_BUCKET = "media";

export default function MediaPicker({
  media,
  onMediaChange,
  url,
  onUrlChange,
  label = "Media",
}: MediaPickerProps) {
  const [uploading, setUploading] =
    useState(false);
  const [uploadError, setUploadError] =
    useState("");

  const inputClass =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-brand";

  const labelClass =
    "mb-1 block text-xs font-medium text-zinc-400";

  function updateMedia(
    partial: Partial<MediaFields>
  ) {
    onMediaChange({ ...media, ...partial });
  }

  async function handleHostingerUpload(
    file: File
  ) {
    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error ||
            "Upload failed."
        );
      }

      onUrlChange(result.url);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSupabaseUpload(
    file: File
  ) {
    setUploading(true);
    setUploadError("");

    try {
      const extension =
        file.name.split(".").pop() ||
        "jpg";

      const filePath = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabaseAuthClient.storage
          .from(SUPABASE_MEDIA_BUCKET)
          .upload(filePath, file, {
            cacheControl: "31536000",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(
          uploadError.message
        );
      }

      const { data } =
        supabaseAuthClient.storage
          .from(SUPABASE_MEDIA_BUCKET)
          .getPublicUrl(filePath);

      onUrlChange(data.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (media.source === "hostinger") {
      handleHostingerUpload(file);
    } else if (
      media.source === "supabase_storage"
    ) {
      handleSupabaseUpload(file);
    }

    event.target.value = "";
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="text-sm font-semibold text-white">
        {label}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Source
          </label>
          <select
            value={media.source}
            onChange={(e) => {
              updateMedia({
                source: e.target
                  .value as MediaSource,
              });
              onUrlChange("");
              setUploadError("");
            }}
            className={inputClass}
          >
            {SOURCE_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Aspect Ratio
          </label>
          <select
            value={media.aspectRatio}
            onChange={(e) =>
              updateMedia({
                aspectRatio: e.target
                  .value as MediaAspectRatio,
              })
            }
            className={inputClass}
          >
            {ASPECT_RATIO_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {media.source === "youtube" && (
        <div className="mt-4">
          <label className={labelClass}>
            YouTube URL
          </label>
          <input
            value={url}
            onChange={(e) =>
              onUrlChange(e.target.value)
            }
            placeholder="https://youtube.com/watch?v=..."
            className={inputClass}
          />
        </div>
      )}

      {(media.source === "hostinger" ||
        media.source ===
          "supabase_storage") && (
        <div className="mt-4">
          <label className={labelClass}>
            {media.source === "hostinger"
              ? "Upload to Hostinger"
              : "Upload to Supabase Storage"}
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelected}
            disabled={uploading}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark disabled:opacity-50"
          />

          {uploading && (
            <p className="mt-2 text-xs text-zinc-500">
              Uploading...
            </p>
          )}

          {uploadError && (
            <p className="mt-2 text-xs text-red-400">
              {uploadError}
            </p>
          )}

          {url && (
            <input
              value={url}
              onChange={(e) =>
                onUrlChange(
                  e.target.value
                )
              }
              className={`${inputClass} mt-2`}
            />
          )}
        </div>
      )}

      {url &&
        media.source !== "youtube" && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Media preview"
              className={`rounded-lg border border-zinc-800 object-cover ${
                media.aspectRatio === "9:16"
                  ? "aspect-[9/16] w-40"
                  : media.aspectRatio ===
                    "4:5"
                  ? "aspect-[4/5] w-48"
                  : "aspect-video w-full max-w-md"
              }`}
            />
          </div>
        )}
    </div>
  );
}
