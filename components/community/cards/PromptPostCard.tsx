"use client";

import { useState } from "react";
import Link from "next/link";
import SaveToNotebookButton from "@/components/notebook/SaveToNotebookButton";
import FeatureInLibraryButton from "@/components/moderation/FeatureInLibraryButton";

type PromptPostCardProps = {
  id: string;
  title: string;
  promptText: string;
  authorName: string;
  category: string;
  aiTool: string | null;
  voteCount: number;
  replyCount: number;
  createdAt: string;
  alreadyFeatured?: boolean;
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

export default function PromptPostCard({
  id,
  title,
  promptText,
  authorName,
  category,
  aiTool,
  voteCount,
  replyCount,
  createdAt,
  alreadyFeatured = false,
}: PromptPostCardProps) {
  const [copied, setCopied] =
    useState(false);

  async function handleCopy(
    event: React.MouseEvent
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(
        promptText
      );
      setCopied(true);
      window.setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      // Clipboard access denied —
      // nothing destructive happens.
    }
  }

  return (
    <Link
      href={`/discussions/${id}`}
      className="block rounded-2xl border border-amber-500/30 bg-white p-5 transition hover:border-amber-500/60"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
          ✨ PROMPT
        </span>

        <span className="text-xs text-zinc-400">
          {category}
          {aiTool && ` • ${aiTool}`}
        </span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold text-zinc-900">
        {title}
      </h3>

      <p className="mt-1 line-clamp-3 rounded-xl bg-zinc-100 p-3 font-mono text-sm text-zinc-400">
        {promptText}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/10"
          >
            {copied
              ? "✓ Copied"
              : "Copy Prompt"}
          </button>

          <SaveToNotebookButton
            contentType="community_thread"
            contentId={id}
            title={title}
            compact
          />

          <FeatureInLibraryButton
            threadId={id}
            title={title}
            promptText={promptText}
            aiTool={aiTool}
            authorName={authorName}
            alreadyFeatured={
              alreadyFeatured
            }
          />
        </div>

        <span className="text-xs text-zinc-400">
          {authorName} ·{" "}
          {timeAgo(createdAt)} · ▲{" "}
          {voteCount} · 💬 {replyCount}
        </span>
      </div>
    </Link>
  );
}
