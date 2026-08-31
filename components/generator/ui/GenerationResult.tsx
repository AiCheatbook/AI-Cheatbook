"use client";

import { useEffect, useState } from "react";
import type {
  GenerationStatus,
  GenerationResult as GenerationResultData,
} from "../hooks/useGeneration";

type GenerationResultProps = {
  status: GenerationStatus;
  result: GenerationResultData | null;
  error: string | null;
  isAnalyzingImage?: boolean;
  onRetry?: () => void;
  canRetry?: boolean;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  showSave?: boolean;
};

const LOADING_MESSAGES = [
  "Thinking through your idea...",
  "Weaving in your selected keywords...",
  "Polishing the final wording...",
];

const IMAGE_LOADING_MESSAGES = [
  "Looking closely at your image...",
  "Working out camera and motion...",
  "This can take up to a minute for image analysis...",
  "Almost there — writing the final prompt...",
];

export default function GenerationResult({
  status,
  result,
  error,
  isAnalyzingImage = false,
  onRetry,
  canRetry = false,
  onSave,
  saving = false,
  saved = false,
  showSave = false,
}: GenerationResultProps) {
  const [copied, setCopied] = useState(false);
  const [messageIndex, setMessageIndex] =
    useState(0);

  const messages = isAnalyzingImage
    ? IMAGE_LOADING_MESSAGES
    : LOADING_MESSAGES;

  useEffect(() => {
    if (status !== "generating") {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((current) =>
        Math.min(
          current + 1,
          messages.length - 1
        )
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [status, messages.length]);

  async function handleCopy() {
    if (!result?.prompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        result.prompt
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      // Clipboard access can be denied by
      // the browser — nothing destructive
      // happens if this silently no-ops.
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Generated Prompt
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your ready-to-use AI prompt
          </p>
        </div>

        {status === "success" &&
          result && (
            <div className="flex gap-2">
              {showSave && (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saved
                    ? "✓ Saved"
                    : saving
                      ? "Saving..."
                      : "Save"}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500 hover:bg-orange-500/10"
              >
                {copied
                  ? "✓ Copied"
                  : "Copy"}
              </button>
            </div>
          )}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-5 sm:p-6">
        {status === "generating" && (
          <div
            aria-live="polite"
            aria-busy="true"
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />

              <p className="text-sm font-medium text-zinc-300">
                {
                  messages[
                    messageIndex
                  ]
                }
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
          >
            <p className="text-sm font-medium text-red-400">
              {error ||
                "Something went wrong."}
            </p>

            {canRetry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {status === "success" &&
          result && (
            <div>
              <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm leading-7 text-zinc-300 sm:text-base">
                {result.prompt}
              </pre>

              {result.provider ===
                "local" && (
                <p className="mt-4 text-xs text-zinc-600">
                  Generated with the
                  built-in generator.
                </p>
              )}
            </div>
          )}

        {status === "idle" && (
          <div className="py-10 text-center">
            <p className="text-zinc-500">
              Your generated prompt will
              appear here.
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Select keywords and click
              Generate Prompt.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
