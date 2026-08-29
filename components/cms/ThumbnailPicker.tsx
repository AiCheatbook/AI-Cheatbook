"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ThumbnailPickerProps = {
  url: string;
  onUrlChange: (next: string) => void;
  label?: string;
};

const SUPABASE_MEDIA_BUCKET = "media";

export default function ThumbnailPicker({
  url,
  onUrlChange,
  label = "Thumbnail",
}: ThumbnailPickerProps) {
  const [uploading, setUploading] =
    useState(false);
  const [uploadError, setUploadError] =
    useState("");

  const inputClass =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-orange-500";

  const labelClass =
    "mb-1 block text-xs font-medium text-zinc-400";

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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h3 className="text-sm font-semibold text-white">
        {label}
      </h3>

      <p className="mt-1 text-xs text-zinc-500">
        Shown everywhere this content
        appears as a card (always 4:5).
        Optional — if left blank, a
        thumbnail is generated
        automatically from the main media.
      </p>

      <div className="mt-4 flex gap-4">
        <div className="flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2 text-center text-[10px] text-zinc-600">
              Auto
            </span>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label className={labelClass}>
              Paste a URL
            </label>
            <input
              value={url}
              onChange={(e) =>
                onUrlChange(
                  e.target.value
                )
              }
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer rounded-lg bg-orange-500 px-3 py-2 text-center text-xs font-medium text-white hover:bg-orange-600">
              Upload to Hostinger
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];
                  if (file) {
                    handleHostingerUpload(
                      file
                    );
                  }
                  e.target.value = "";
                }}
                disabled={uploading}
                className="sr-only"
              />
            </label>

            <label className="flex-1 cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-center text-xs font-medium text-white hover:bg-zinc-800">
              Upload to Supabase
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];
                  if (file) {
                    handleSupabaseUpload(
                      file
                    );
                  }
                  e.target.value = "";
                }}
                disabled={uploading}
                className="sr-only"
              />
            </label>
          </div>

          {uploading && (
            <p className="text-xs text-zinc-500">
              Uploading...
            </p>
          )}

          {uploadError && (
            <p className="text-xs text-red-400">
              {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
