"use client";

import { useState } from "react";

type PromptOutputProps = {
  prompt?: string;
  loading?: boolean;
  error?: string;
};

export default function PromptOutput({
  prompt = "",
  loading = false,
  error,
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!prompt || loading) {
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (copyError) {
      console.error(
        "Failed to copy prompt:",
        copyError
      );
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">

      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-2xl font-bold text-white">
            Generated Prompt
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Your ready-to-use AI prompt
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!prompt || loading}
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>

      </div>

      {/* Output */}

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 sm:p-6">

        {loading ? (
          <div className="space-y-3">

            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />

            <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />

            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />

            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />

          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">

            <p className="text-sm font-medium text-red-400">
              {error}
            </p>

          </div>
        ) : prompt ? (
          <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm leading-7 text-zinc-300 sm:text-base">
            {prompt}
          </pre>
        ) : (
          <div className="py-10 text-center">

            <p className="text-zinc-500">
              Your generated prompt will appear here.
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              Select keywords and click Generate Prompt.
            </p>

          </div>
        )}

      </div>

    </section>
  );
}