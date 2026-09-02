import Link from "next/link";

export type CardContentKind =
  | "question"
  | "discussion"
  | "discovery"
  | "poll"
  | "quiz";

type OTTCardProps = {
  kind: CardContentKind;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  voteCount: number;
  replyCount: number;
  createdAt: string;
  href: string;
  isAnswered?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
};

const KIND_META: Record<
  CardContentKind,
  {
    label: string;
    icon: string;
    accent: string;
  }
> = {
  question: {
    label: "Question",
    icon: "💡",
    accent:
      "border-blue-500/30 hover:border-blue-500/60",
  },
  discussion: {
    label: "Discussion",
    icon: "💬",
    accent:
      "border-brand/30 hover:border-brand/60",
  },
  discovery: {
    label: "Discovery",
    icon: "🚀",
    accent:
      "border-purple-500/30 hover:border-purple-500/60",
  },
  poll: {
    label: "Poll",
    icon: "📊",
    accent:
      "border-green-500/30 hover:border-green-500/60",
  },
  quiz: {
    label: "Quiz",
    icon: "🧠",
    accent:
      "border-pink-500/30 hover:border-pink-500/60",
  },
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() -
      new Date(dateString).getTime()) /
      1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(
    seconds / 60
  );
  if (minutes < 60)
    return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(
    dateString
  ).toLocaleDateString();
}

export default function OTTCard({
  kind,
  title,
  preview,
  authorName,
  category,
  voteCount,
  replyCount,
  createdAt,
  href,
  isAnswered,
  isTrending,
  isNew,
}: OTTCardProps) {
  const meta = KIND_META[kind];

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border bg-zinc-900 p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${meta.accent}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
          {meta.icon} {meta.label}
        </span>

        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-600">
          {category}
        </span>

        {isTrending && (
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand">
            🔥 Trending
          </span>
        )}

        {isNew && !isTrending && (
          <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
            🆕 New
          </span>
        )}

        {isAnswered && (
          <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
            🏆 Answered
          </span>
        )}
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white transition group-hover:text-brand">
        {title}
      </h3>

      {preview && (
        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600">
          {preview}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
        <span>
          {authorName} ·{" "}
          {timeAgo(createdAt)}
        </span>

        <span className="flex items-center gap-3">
          <span>▲ {voteCount}</span>
          <span>
            💬 {replyCount}
          </span>
        </span>
      </div>
    </Link>
  );
}
