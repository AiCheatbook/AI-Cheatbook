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
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-brand";

  const labelClass =
    "mb-1 block text-xs font-medium text-zinc-600";

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

  const [isDragging, setIsDragging] =
    useState(false);
  const [fileName, setFileName] =
    useState("");

  function handleDrop(
    event: React.DragEvent
  ) {
    event.preventDefault();
    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      setFileName(file.name);
      handleHostingerUpload(file);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {label}
      </h3>

      <p className="mt-1 text-xs text-zinc-600">
        Shown everywhere this content
        appears as a card (always 4:5).
        Optional — if left blank, a
        thumbnail is generated
        automatically from the main media.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() =>
          setIsDragging(false)
        }
        onDrop={handleDrop}
        className={`mt-4 flex gap-4 rounded-xl border-2 border-dashed p-3 transition ${
          isDragging
            ? "border-brand bg-brand-light"
            : "border-zinc-200"
        }`}
      >
        <div className="flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
          <label className="block cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-xs text-zinc-600 transition hover:border-brand hover:bg-brand-light">
            <span className="font-medium text-zinc-900">
              Drag & drop an image here
            </span>
            <br />
            or click to browse
            <br />
            <span className="text-[10px] text-zinc-500">
              JPG / PNG / WEBP
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  setFileName(
                    file.name
                  );
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

          {fileName && (
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
              <span className="truncate text-xs text-zinc-600">
                📎 {fileName}
              </span>

              {url && (
                <button
                  type="button"
                  onClick={() => {
                    onUrlChange("");
                    setFileName("");
                  }}
                  className="shrink-0 text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900">
              More options (paste URL,
              upload to Supabase instead)
            </summary>

            <div className="mt-3 space-y-3">
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

              <label className="block cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-center text-xs font-medium text-zinc-900 hover:bg-zinc-100">
                Upload to Supabase
                instead
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file =
                      e.target
                        .files?.[0];

                    if (file) {
                      setFileName(
                        file.name
                      );
                      handleSupabaseUpload(
                        file
                      );
                    }

                    e.target.value =
                      "";
                  }}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>
          </details>

          {uploading && (
            <p className="text-xs text-zinc-600">
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
