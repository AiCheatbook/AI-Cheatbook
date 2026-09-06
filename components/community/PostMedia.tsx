"use client";

import { useState } from "react";

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  const id = watchMatch?.[1] || shortMatch?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function youtubeVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  return watchMatch?.[1] || shortMatch?.[1] || null;
}

export default function PostMedia({
  imageUrls,
  videoUrl,
  youtubeUrl,
  priority = false,
}: {
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
  /*
   * Set true only for the single above-the-fold post in a feed
   * (e.g. the first item). Marking every image "high priority"
   * would have every image compete for bandwidth at once,
   * defeating the purpose — this should only ever be true for
   * whichever post actually is the page's LCP candidate.
   */
  priority?: boolean;
}) {
  const [playingYoutube, setPlayingYoutube] = useState(false);

  if (imageUrls && imageUrls.length > 0) {
    return (
      <div
        className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${
          imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {imageUrls.slice(0, 5).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url + i}
            src={url}
            alt=""
            width={800}
            height={320}
            {...(priority && i === 0
              ? { fetchPriority: "high" as const }
              : { loading: "lazy" as const })}
            className="max-h-80 w-full bg-zinc-100 object-cover"
          />
        ))}
      </div>
    );
  }

  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        onClick={(e) => e.stopPropagation()}
        className="mt-3 max-h-96 w-full rounded-xl bg-zinc-100"
      />
    );
  }

  if (youtubeUrl) {
    const embedUrl = youtubeEmbedUrl(youtubeUrl);
    const videoId = youtubeVideoId(youtubeUrl);
    if (!embedUrl || !videoId) return null;

    if (playingYoutube) {
      return (
        <div
          className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={`${embedUrl}?autoplay=1`}
            title="YouTube video"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }

    /*
     * YouTube's own iframe embed pulls in ~845KB of its own JS
     * (base.js, player assets) the instant it's on the page —
     * even if the visitor never plays the video. Showing a plain
     * thumbnail image first, and only loading the real iframe
     * once clicked, avoids paying that cost for every feed post
     * with a video that nobody actually watches.
     */
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPlayingYoutube(true);
        }}
        className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-xl bg-zinc-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1 h-6 w-6"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return null;
}
