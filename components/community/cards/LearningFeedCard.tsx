import Link from "next/link";

type LearningFeedCardProps = {
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
    (Date.now() -
      new Date(dateString).getTime()) /
      1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LearningFeedCard({
  title,
  excerpt,
  authorName,
  category,
  imageUrl,
  publishedAt,
  href,
}: LearningFeedCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm transition hover:border-cyan-400 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              📘 LEARNING
            </span>

            {category && (
              <span className="text-xs text-zinc-500">
                {category}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 line-clamp-2 font-semibold text-zinc-900">
            {title}
          </h3>

          {excerpt && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
              {excerpt}
            </p>
          )}

          <p className="mt-2 text-xs text-zinc-400">
            {authorName &&
              `${authorName} · `}
            {timeAgo(publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
