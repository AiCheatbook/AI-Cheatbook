/*
 * Given a stored media URL + source, works out
 * the actual image URL to display.
 *
 * - YouTube: converts the video link into its
 *   real thumbnail image.
 * - Hostinger / Supabase Storage / legacy plain
 *   URLs: used as-is, since they're already a
 *   direct image link.
 */

export function getYoutubeVideoId(
  url: string
): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return null;
}

export function getYoutubeEmbedUrl(
  url: string
): string {
  const videoId =
    getYoutubeVideoId(url);

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}

export function resolveDisplayImageUrl(
  url: string | null | undefined,
  source?: string | null
): string {
  if (!url) {
    return "";
  }

  if (source === "youtube") {
    const videoId =
      getYoutubeVideoId(url);

    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    return "";
  }

  return url;
}

export function isYoutubeSource(
  source?: string | null
): boolean {
  return source === "youtube";
}

/*
 * The URL to show wherever this content
 * appears as a card/thumbnail (always 4:5).
 *
 * Prefers a custom thumbnail if one was
 * set; otherwise falls back to a thumbnail
 * generated from the main media.
 */

export function resolveThumbnailUrl(
  thumbnailUrl: string | null | undefined,
  mediaUrl: string | null | undefined,
  mediaSource?: string | null
): string {
  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  return resolveDisplayImageUrl(
    mediaUrl,
    mediaSource
  );
}
