import Link from "next/link";

type PollCardProps = {
  id: string;
  question: string;
  authorName: string;
  category: string;
  voteCount: number;
  createdAt: string;
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() -
      new Date(dateString).getTime()) /
      1000
  );

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
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

export default function PollCard({
  id,
  question,
  authorName,
  category,
  voteCount,
  createdAt,
}: PollCardProps) {
  return (
    <Link
      href={`/community/polls/${id}`}
      className="block rounded-2xl border border-green-500/30 bg-white p-5 transition hover:border-green-500/60"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
          📊 POLL
        </span>
        <span className="text-xs text-zinc-600">
          {category}
        </span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold text-zinc-900">
        {question}
      </h3>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
        <span>
          {authorName} ·{" "}
          {timeAgo(createdAt)}
        </span>
        <span>
          {voteCount}{" "}
          {voteCount === 1
            ? "vote"
            : "votes"}
        </span>
      </div>
    </Link>
  );
}
