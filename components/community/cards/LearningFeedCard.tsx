"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";
import ContentReactionBar from "@/components/community/ContentReactionBar";

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
 * than a small generic tile. See NewsFeedCard for the sibling
 * "News" variant (identical structure, different theme color).
 *
 * Comment count is real (fetched from the same `comments` table
 * CommentSection already uses on the article page). Like/React is
 * backed by database/040_content_reactions.sql, mirroring the
 * existing comment_reactions pattern one level up.
 */
export default function LearningFeedCard({
  id,
  title,
  excerpt,
  authorName,
  category,
  imageUrl,
  publishedAt,
  href,
}: LearningFeedCardProps) {
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadCount() {
      const { count, error } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("content_type", "learning_card")
        .eq("content_id", id);

      if (error) {
        console.error(
          "LearningFeedCard: failed to load comment count:",
          error.message
        );
        return;
      }

      setCommentCount(count || 0);
    }

    loadCount();
  }, [id]);

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm transition hover:border-cyan-400 hover:shadow-md">
      <Link href={href} className="block">
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

        <div className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              📘 LEARNING
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

      <div className="flex items-center justify-between px-5 pb-4 text-xs text-zinc-600">
        <span className="flex items-center gap-3">
          <ContentReactionBar contentType="learning_card" contentId={id} />
          <Link href={href} className="hover:text-brand-text">
            💬 {commentCount ?? "…"}{" "}
            {commentCount === 1 ? "comment" : "comments"}
          </Link>
        </span>

        <SaveToNotebookButton
          contentType="learning_card"
          contentId={id}
          title={title}
          compact
        />
      </div>
    </div>
  );
}
