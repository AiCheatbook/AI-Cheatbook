"use client";

import { useState } from "react";

const SAVED_KEYWORDS_STORAGE_KEY =
  "ai-cheatbook-saved-keywords";

const KEYWORDS_UPDATED_EVENT =
  "ai-cheatbook-keywords-updated";

type PromptActionsProps = {
  prompt: string;
  ingredients: string[];
};

export default function PromptActions({
  prompt,
  ingredients,
}: PromptActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleCopy() {
    if (!prompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy prompt:",
        error
      );
    }
  }

  function handleSave() {
    if (ingredients.length === 0) {
      return;
    }

    try {
      const existingKeywords = JSON.parse(
        localStorage.getItem(
          SAVED_KEYWORDS_STORAGE_KEY
        ) || "[]"
      );

      const safeExistingKeywords =
        Array.isArray(existingKeywords)
          ? existingKeywords
          : [];

      const updatedKeywords = Array.from(
        new Set([
          ...safeExistingKeywords,
          ...ingredients,
        ])
      );

      localStorage.setItem(
        SAVED_KEYWORDS_STORAGE_KEY,
        JSON.stringify(updatedKeywords)
      );

      setSaved(true);

      window.dispatchEvent(
        new Event(KEYWORDS_UPDATED_EVENT)
      );

      window.setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to save keywords:",
        error
      );
    }
  }

  async function handleShare() {
    const shareData = {
      title: document.title,
      text: `Check out this AI prompt: ${prompt}`,
      url: window.location.href,
    };

    try {
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(
        window.location.href
      );

      setShared(true);

      window.setTimeout(() => {
        setShared(false);
      }, 2000);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Failed to share prompt:",
        error
      );
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

      {/* Copy */}

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-xl bg-brand px-6 py-4 font-semibold text-white transition hover:bg-brand-dark"
      >
        {copied
          ? "✓ Copied"
          : "📋 Copy Prompt"}
      </button>

      {/* Save */}

      <button
        type="button"
        onClick={handleSave}
        disabled={ingredients.length === 0}
        className="rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-white transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saved ? "✓ Saved" : "❤️ Save"}
      </button>

      {/* Share */}

      <button
        type="button"
        onClick={handleShare}
        className="rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-white transition hover:border-brand"
      >
        {shared
          ? "✓ Link Copied"
          : "🔗 Share"}
      </button>

    </div>
  );
}