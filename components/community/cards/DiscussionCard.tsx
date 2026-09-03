import Link from "next/link";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";
import ReportButton from "@/components/moderation/ReportButton";
import LikeButton from "@/components/community/LikeButton";
import PostMedia from "@/components/community/PostMedia";

type DiscussionCardProps = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  replyCount: number;
  voteCount: number;
  createdAt: string;
  mediaUrls?: string[] | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
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
  mediaUrls,
  videoUrl,
  youtubeUrl,
}: DiscussionCardProps) {
  return (
    <Link
      href={`/discussions/${id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-brand/40"
    >
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 font-bold text-brand-text">
          {authorName
            .charAt(0)
            .toUpperCase()}
        </span>
        <span className="text-zinc-600">
          {authorName}
        </span>
        <span>·</span>
        <span>{category}</span>
        <span>·</span>
        <span>{timeAgo(createdAt)}</span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold text-zinc-900">
        {title}
      </h3>

      {preview && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
          {preview}
        </p>
      )}

      <PostMedia
        imageUrls={mediaUrls}
        videoUrl={videoUrl}
        youtubeUrl={youtubeUrl}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
        <span className="flex items-center gap-3">
          <LikeButton threadId={id} initialCount={voteCount} compact />
          <span>💬 {replyCount} Comments</span>
        </span>

        <div className="flex items-center gap-3">
          <SaveToNotebookButton
            contentType="community_thread"
            contentId={id}
            title={title}
          />

          <ReportButton
            contentType="community_thread"
            contentId={id}
          />
        </div>
      </div>
    </Link>
  );
}
