import Link from "next/link";

type LearningPostCardProps = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  replyCount: number;
  voteCount: number;
  createdAt: string;
};

export default function LearningPostCard({
  id,
  title,
  preview,
  authorName,
  category,
  replyCount,
  voteCount,
}: LearningPostCardProps) {
  return (
    <Link
      href={`/discussions/${id}`}
      className="block rounded-2xl border border-cyan-500/30 bg-white p-5 transition hover:border-cyan-500/60"
    >
      <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400">
        📘 LEARNING
      </span>

      <h3 className="mt-2.5 text-lg font-semibold text-zinc-900">
        {title}
      </h3>

      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
          {preview}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>
          Useful for {category} ·{" "}
          {authorName}
        </span>
        <span>
          ▲ {voteCount} · 💬{" "}
          {replyCount}
        </span>
      </div>
    </Link>
  );
}
