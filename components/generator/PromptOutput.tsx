"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type PromptOutputProps = {
  prompt?: string;
  loading?: boolean;
  error?: string;
  aiTool?: string;
  task?: string;
  isLoggedIn?: boolean;
};

export default function PromptOutput({
  prompt = "",
  loading = false,
  error,
  aiTool,
  task,
  isLoggedIn = false,
}: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  async function handleSave() {
    if (!prompt || saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setSaveError(
          "Please log in to save prompts."
        );
        return;
      }

      const title = (
        task || "Saved prompt"
      ).slice(0, 80);

      const { error: insertError } =
        await supabaseAuthClient
          .from("saved_prompts")
          .insert({
            user_id: user.id,
            title,
            prompt_text: prompt,
            ai_tool: aiTool || null,
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save prompt."
      );
    } finally {
      setSaving(false);
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

          <p className="mt-1 text-sm text-zinc-600">
            Your ready-to-use AI prompt
          </p>
        </div>

        <div className="flex gap-2">
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!prompt || loading || saving}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
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
            disabled={!prompt || loading}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

      </div>

      {saveError && (
        <p className="mt-3 text-sm text-red-400">
          {saveError}
        </p>
      )}

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

            <p className="text-zinc-600">
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
