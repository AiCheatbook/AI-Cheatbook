import Link from "next/link";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";

type DiscussionCardProps = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  replyCount: number;
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

export default function DiscussionCard({
  id,
  title,
  preview,
  authorName,
  category,
  replyCount,
  voteCount,
  createdAt,
}: DiscussionCardProps) {
  return (
    <Link
      href={`/discussions/${id}`}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-orange-500/40"
    >
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 font-bold text-orange-400">
          {authorName
            .charAt(0)
            .toUpperCase()}
        </span>
        <span className="text-zinc-300">
          {authorName}
        </span>
        <span>·</span>
        <span>{category}</span>
        <span>·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold text-white">
        {title}
      </h3>

      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
          {preview}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          ▲ {voteCount} Helpful · 💬{" "}
          {replyCount} Comments
        </span>

        <SaveToNotebookButton
          contentType="community_thread"
          contentId={id}
          title={title}
        />
      </div>
    </Link>
  );
}
