"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const CATEGORIES = [
  { value: "general", label: "General" },
  {
    value: "prompt_help",
    label: "Prompt Help",
  },
  {
    value: "feedback",
    label: "Feedback",
  },
  {
    value: "bug_report",
    label: "Bug Report",
  },
  {
    value: "showcase",
    label: "Showcase",
  },
];

const CONTENT_KINDS = [
  {
    value: "question",
    label: "💡 Question",
  },
  {
    value: "discussion",
    label: "💬 Discussion",
  },
  {
    value: "discovery",
    label: "🚀 Discovery",
  },
];

export default function NewDiscussionPage() {
  return (
    <Suspense fallback={null}>
      <NewDiscussionPageContent />
    </Suspense>
  );
}

function NewDiscussionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkingAuth, setCheckingAuth] =
    useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState("general");
  const [contentKind, setContentKind] =
    useState(
      searchParams.get("kind") ||
        "discussion"
    );
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/discussions/new"
        );
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError(
        "Title and body are both required."
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
          "Please log in to post a discussion."
        );
      }

      const { data, error: insertError } =
        await supabaseAuthClient
          .from("community_threads")
          .insert({
            user_id: user.id,
            title: title.trim(),
            body: body.trim(),
            category,
            content_kind: contentKind,
          })
          .select("id")
          .single();

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      router.push(
        `/discussions/${data.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to post discussion."
      );
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return null;
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
          {contentKind === "question"
            ? "Ask a Question"
            : contentKind === "discovery"
              ? "Share a Discovery"
              : "Start a Discussion"}
        </h1>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm font-medium text-zinc-400">
            Type
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTENT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() =>
                  setContentKind(k.value)
                }
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  contentKind === k.value
                    ? "border-brand bg-brand text-zinc-900"
                    : "border-zinc-300 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Category
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() =>
                  setCategory(c.value)
                }
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  category === c.value
                    ? "border-brand bg-brand text-zinc-900"
                    : "border-zinc-300 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Title
          </label>
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="What's your question or topic?"
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Details
          </label>
          <textarea
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
            rows={8}
            placeholder="Give as much detail as you can..."
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting
            ? "Posting..."
            : "Post"}
        </button>
      </form>
    </main>
  );
}
