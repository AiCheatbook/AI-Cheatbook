function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  const id = watchMatch?.[1] || shortMatch?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export default function PostMedia({
  imageUrls,
  videoUrl,
  youtubeUrl,
}: {
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
}) {
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
    if (!embedUrl) return null;

    return (
      <div
        className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={embedUrl}
          title="YouTube video"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return null;
}
