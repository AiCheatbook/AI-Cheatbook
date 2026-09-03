import Link from "next/link";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";
import LikeButton from "@/components/community/LikeButton";
import PostMedia from "@/components/community/PostMedia";

type ResourcePostCardProps = {
  id: string;
  title: string;
  preview: string;
  authorName: string;
  category: string;
  resourceUrl: string | null;
  voteCount: number;
  replyCount: number;
  mediaUrls?: string[] | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function ResourcePostCard({
  id,
  title,
  preview,
  authorName,
  category,
  resourceUrl,
  voteCount,
  replyCount,
  mediaUrls,
  videoUrl,
  youtubeUrl,
}: ResourcePostCardProps) {
  return (
    <Link
      href={`/discussions/${id}`}
      className="block rounded-2xl border border-indigo-500/30 bg-white p-5 transition hover:border-indigo-500/60"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
          🔗 RESOURCE
        </span>

        {resourceUrl && (
          <span className="text-xs text-zinc-600">
            {getDomain(resourceUrl)}
          </span>
        )}
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
        <span>
          Shared by {authorName} · {category}
        </span>

        <span className="flex items-center gap-3">
          <LikeButton threadId={id} initialCount={voteCount} compact />
          <span>💬 {replyCount}</span>
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
