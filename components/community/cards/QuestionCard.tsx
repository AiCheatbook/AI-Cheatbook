import Link from "next/link";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";

type QuestionCardProps = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  replyCount: number;
  voteCount: number;
  createdAt: string;
  isAnswered: boolean;
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

export default function QuestionCard({
  id,
  title,
  preview,
  authorName,
  category,
  replyCount,
  voteCount,
  createdAt,
  isAnswered,
}: QuestionCardProps) {
  return (
    <Link
      href={`/discussions/${id}`}
      className={`block rounded-2xl border bg-white p-5 transition ${
        isAnswered
          ? "border-green-600/40 hover:border-green-500/60"
          : "border-blue-500/30 hover:border-blue-500/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
          💡 QUESTION
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            isAnswered
              ? "bg-green-500/10 text-green-400"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {isAnswered
            ? "✓ Answered"
            : "Unanswered"}
        </span>

        <span className="text-xs text-zinc-600">
          {category}
        </span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold text-zinc-900">
        {title}
      </h3>

      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
          {preview}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
        <span>
          Asked by {authorName} ·{" "}
          {timeAgo(createdAt)}
        </span>

        <span className="flex items-center gap-3">
          <span>▲ {voteCount}</span>
          <span>
            {replyCount}{" "}
            {replyCount === 1
              ? "answer"
              : "answers"}
          </span>

          <SaveToNotebookButton
            contentType="community_thread"
            contentId={id}
            title={title}
            compact
          />
        </span>
      </div>
    </Link>
  );
}
