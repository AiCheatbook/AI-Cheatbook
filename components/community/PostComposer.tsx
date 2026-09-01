"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type PostType = "question" | "discussion";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "prompt_help", label: "Prompt Help" },
  { value: "feedback", label: "Feedback" },
  { value: "bug_report", label: "Bug Report" },
  { value: "showcase", label: "Showcase" },
];

type PostComposerProps = {
  onClose: () => void;
  isLoggedIn: boolean;
};

export default function PostComposer({
  onClose,
  isLoggedIn,
}: PostComposerProps) {
  const router = useRouter();

  const [postType, setPostType] =
    useState<PostType>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState("general");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError(
        "Title and details are both required."
      );
      return;
    }

    if (!isLoggedIn) {
      setError(
        "Please log in to post."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabaseAuthClient.auth.getUser();

      if (userError) {
        throw new Error(
          `Could not verify your session: ${userError.message}`
        );
      }

      if (!user) {
        throw new Error(
          "Your session appears to have expired. Please log in again."
        );
      }

      const {
        data: inserted,
        error: insertError,
      } = await supabaseAuthClient
        .from("community_threads")
        .insert({
          user_id: user.id,
          title: title.trim(),
          body: body.trim(),
          category,
          content_kind: postType,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(
          `Save failed: ${insertError.message}`
        );
      }

      if (!inserted || !inserted.id) {
        throw new Error(
          "The post didn't save correctly — no confirmation was returned from the server. Please try again, and if this keeps happening, let support know."
        );
      }

      const {
        data: verifyRow,
        error: verifyError,
      } = await supabaseAuthClient
        .from("community_threads")
        .select("id")
        .eq("id", inserted.id)
        .maybeSingle();

      if (verifyError || !verifyRow) {
        throw new Error(
          "Your post was created but couldn't be confirmed as saved. Please refresh and check if it appears before posting again."
        );
      }

      router.push(
        `/discussions/${inserted.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while posting. Please try again."
      );
      console.error(
        "Post creation failed:",
        err
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Create a Post
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setPostType(
                  "discussion"
                )
              }
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                postType === "discussion"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              💬 Discussion
            </button>

            <button
              type="button"
              onClick={() =>
                setPostType("question")
              }
              className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                postType === "question"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              💡 Question
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() =>
                  setCategory(c.value)
                }
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  category === c.value
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder={
              postType === "question"
                ? "What's your question?"
                : "What do you want to talk about?"
            }
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
          />

          <textarea
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
            rows={6}
            placeholder="Add details..."
            className="mt-3 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none focus:border-orange-500"
          />

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Posting..."
              : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
