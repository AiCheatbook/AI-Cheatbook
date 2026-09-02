"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  text?: string;
  className?: string;
};

export default function ShareButton({
  title,
  text = "",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] =
    useState(false);

  async function handleShare() {
    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      /*
       * User cancelling the native share
       * sheet throws — not an error worth
       * surfacing.
       */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-900"
      }
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
