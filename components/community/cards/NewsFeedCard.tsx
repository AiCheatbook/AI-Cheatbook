import Link from "next/link";

type NewsFeedCardProps = {
  id: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  category: string | null;
  imageUrl: string | null;
  publishedAt: string;
  href: string;
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/*
 * High-priority content card (News/Learning) — large media-forward
 * layout, similar in spirit to a modern social feed post rather
 * than a small generic tile. See LearningFeedCard for the sibling
 * "Learning" variant (identical structure, different theme color).
 */
export default function NewsFeedCard({
  title,
  excerpt,
  authorName,
  category,
  imageUrl,
  publishedAt,
  href,
}: NewsFeedCardProps) {
  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-brand/50 hover:shadow-md"
    >
      {imageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-text">
            📰 NEWS
          </span>

          {category && (
            <span className="text-xs text-zinc-500">{category}</span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-zinc-900">
          {title}
        </h3>

        {excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">
            {excerpt}
          </p>
        )}

        <p className="mt-3 text-xs text-zinc-400">
          {authorName && `${authorName} · `}
          {timeAgo(publishedAt)}
        </p>
      </div>
    </Link>
  );
}
