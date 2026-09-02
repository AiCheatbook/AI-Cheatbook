"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const CATEGORIES = [
  "video",
  "image",
  "text",
  "audio",
  "other",
] as const;

const TYPES = [
  "prompt",
  "concept",
  "technique",
] as const;

const AI_TOOL_OPTIONS = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

export default function SubmitPromptPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [promptText, setPromptText] =
    useState("");
  const [category, setCategory] =
    useState<string>("video");
  const [type, setType] =
    useState<string>("prompt");
  const [aiTools, setAiTools] = useState<
    string[]
  >([]);

  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/submit/prompt"
        );
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  function toggleAiTool(tool: string) {
    setAiTools((current) =>
      current.includes(tool)
        ? current.filter(
            (t) => t !== tool
          )
        : [...current, tool]
    );
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!promptText.trim()) {
      setError(
        "Prompt content is required."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        throw new Error(
          "Please log in to submit a prompt."
        );
      }

      const { error: insertError } =
        await supabaseAuthClient
          .from("prompt_submissions")
          .insert({
            submitted_by: user.id,
            title: title.trim(),
            description:
              description.trim() || null,
            prompt_text:
              promptText.trim(),
            category,
            type,
            ai_tools: aiTools,
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit prompt."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return null;
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-900">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold">
            Submitted for review!
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            Thanks — our team will review
            your prompt before it goes
            live on the site.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/account/submissions"
              className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              View My Submissions
            </Link>

            <Link
              href="/generator"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark"
            >
              Back to Generator
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-brand";

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl"
      >
        <h1 className="text-2xl font-bold">
          Submit a Prompt
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Share a prompt with the community.
          It'll be reviewed before
          publishing.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm font-medium text-zinc-400">
            Title
          </label>
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="e.g. Cinematic Static Shot"
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Description{" "}
            <span className="text-zinc-400">
              (optional)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            rows={3}
            placeholder="A short description of what this prompt does..."
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Prompt Content
          </label>
          <textarea
            value={promptText}
            onChange={(e) =>
              setPromptText(
                e.target.value
              )
            }
            rows={6}
            placeholder="The actual prompt text..."
            className={inputClass}
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-400">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option
                  key={c}
                  value={c}
                >
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400">
              Type
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option
                  key={t}
                  value={t}
                >
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            AI Tools
          </label>

          <div className="mt-2 flex flex-wrap gap-2">
            {AI_TOOL_OPTIONS.map(
              (tool) => {
                const selected =
                  aiTools.includes(
                    tool
                  );

                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() =>
                      toggleAiTool(
                        tool
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      selected
                        ? "border-brand bg-brand/15 text-brand"
                        : "border-zinc-200 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {tool}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : "Submit for Review"}
        </button>
      </form>
    </main>
  );
}
