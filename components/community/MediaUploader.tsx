"use client";

import { useRef, useState } from "react";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB, per spec's current agreed limit
// (the upload endpoint itself allows up to 100MB, kept in mind for later —
// see database/039_post_composer_media.sql comment)

type MediaMode = "images" | "video" | "youtube";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: string | null;
};

type VideoItem = {
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: string | null;
};

export type MediaValue = {
  mode: MediaMode;
  imageUrls: string[];
  videoUrl: string | null;
  youtubeUrl: string | null;
};

type MediaUploaderProps = {
  onChange: (value: MediaValue) => void;
};

function isValidYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(
    url.trim()
  );
}

export default function MediaUploader({ onChange }: MediaUploaderProps) {
  const [mode, setMode] = useState<MediaMode>("images");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function emit(next: {
    images?: ImageItem[];
    video?: VideoItem | null;
    youtubeUrl?: string;
    mode?: MediaMode;
  }) {
    const effectiveImages = next.images ?? images;
    const effectiveVideo = next.video === undefined ? video : next.video;
    const effectiveYoutube = next.youtubeUrl ?? youtubeUrl;
    const effectiveMode = next.mode ?? mode;

    onChange({
      mode: effectiveMode,
      imageUrls: effectiveImages
        .map((i) => i.uploadedUrl)
        .filter((u): u is string => Boolean(u)),
      videoUrl: effectiveVideo?.uploadedUrl ?? null,
      youtubeUrl:
        effectiveMode === "youtube" &&
        isValidYoutubeUrl(effectiveYoutube)
          ? effectiveYoutube.trim()
          : null,
    });
  }

  function changeMode(next: MediaMode) {
    setMode(next);
    emit({ mode: next });
  }

  async function uploadImageFile(item: ImageItem) {
    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      setImages((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                uploading: false,
                uploadedUrl: data.success ? data.url : null,
                error: data.success
                  ? null
                  : data.error || "Upload failed.",
              }
            : i
        );
        emit({ images: next });
        return next;
      });
    } catch (err) {
      console.error("MediaUploader: image upload failed:", err);
      setImages((prev) => {
        const next = prev.map((i) =>
          i.id === item.id
            ? { ...i, uploading: false, error: "Upload failed." }
            : i
        );
        emit({ images: next });
        return next;
      });
    }
  }

  function addImages(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );

    const room = MAX_IMAGES - images.length;
    const accepted = incoming.slice(0, room);

    const items: ImageItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      uploading: file.size <= MAX_IMAGE_BYTES,
      error:
        file.size > MAX_IMAGE_BYTES
          ? "Image is larger than 5MB."
          : null,
    }));

    const next = [...images, ...items];
    setImages(next);
    emit({ images: next });

    for (const item of items) {
      if (!item.error) {
        uploadImageFile(item);
      }
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((i) => i.id !== id);
      emit({ images: next });
      return next;
    });
  }

  async function uploadVideoFile(item: VideoItem) {
    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const res = await fetch("/api/artwork-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      setVideo((prev) => {
        if (!prev || prev.file !== item.file) return prev;
        const next: VideoItem = {
          ...prev,
          uploading: false,
          uploadedUrl: data.success ? data.url : null,
          error: data.success ? null : data.error || "Upload failed.",
        };
        emit({ video: next });
        return next;
      });
    } catch (err) {
      console.error("MediaUploader: video upload failed:", err);
      setVideo((prev) => {
        if (!prev || prev.file !== item.file) return prev;
        const next: VideoItem = {
          ...prev,
          uploading: false,
          error: "Upload failed.",
        };
        emit({ video: next });
        return next;
      });
    }
  }

  function addVideo(file: File) {
    if (!file.type.startsWith("video/")) return;

    const item: VideoItem = {
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      uploading: file.size <= MAX_VIDEO_BYTES,
      error:
        file.size > MAX_VIDEO_BYTES
          ? "Video is larger than 50MB."
          : null,
    };

    setVideo(item);
    emit({ video: item });

    if (!item.error) {
      uploadVideoFile(item);
    }
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
    emit({ video: null });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (mode === "images") {
      addImages(files);
    } else if (mode === "video") {
      addVideo(files[0]);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {(
          [
            { value: "images", label: "🖼️ Images" },
            { value: "video", label: "🎬 Video" },
            { value: "youtube", label: "▶️ YouTube link" },
          ] as const
        ).map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => changeMode(m.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              mode === m.value
                ? "border-brand bg-brand/10 text-brand-text"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-500"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "youtube" && (
        <input
          value={youtubeUrl}
          onChange={(e) => {
            setYoutubeUrl(e.target.value);
            emit({ youtubeUrl: e.target.value });
          }}
          placeholder="https://youtube.com/watch?v=..."
          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-brand"
        />
      )}

      {mode === "youtube" &&
        youtubeUrl.trim() &&
        !isValidYoutubeUrl(youtubeUrl) && (
          <p className="mt-1.5 text-xs text-red-500">
            That doesn&apos;t look like a YouTube link yet.
          </p>
        )}

      {(mode === "images" || mode === "video") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragActive
              ? "border-brand bg-brand/5"
              : "border-zinc-300 hover:border-zinc-400"
          }`}
        >
          <span className="text-2xl">
            {mode === "images" ? "🖼️" : "🎬"}
          </span>
          <p className="mt-2 text-sm text-zinc-600">
            Drag and drop {mode === "images" ? "images" : "a video"} here,
            or click to browse
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {mode === "images"
              ? `Up to ${MAX_IMAGES} images, 5MB each`
              : "Up to 50MB"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "images" ? "image/*" : "video/*"}
            multiple={mode === "images"}
            className="hidden"
            onChange={(e) => {
              if (!e.target.files) return;
              if (mode === "images") {
                addImages(e.target.files);
              } else {
                addVideo(e.target.files[0]);
              }
              e.target.value = "";
            }}
          />
        </div>
      )}

      {mode === "images" && images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/70 text-xs text-white"
              >
                ✕
              </button>

              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-xs text-zinc-600">
                  Uploading...
                </div>
              )}

              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-1 text-center text-[10px] text-red-600">
                  {img.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mode === "video" && video && (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          <video
            src={video.previewUrl}
            controls
            className="max-h-64 w-full"
          />

          <button
            type="button"
            onClick={removeVideo}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/70 text-xs text-white"
          >
            ✕
          </button>

          {video.uploading && (
            <p className="px-3 py-2 text-xs text-zinc-600">Uploading...</p>
          )}

          {video.error && (
            <p className="px-3 py-2 text-xs text-red-600">{video.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
