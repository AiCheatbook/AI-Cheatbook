"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type PostType =
  | "question"
  | "discussion"
  | "prompt"
  | "learning"
  | "resource";

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
  const [aiTool, setAiTool] = useState("");
  const [resourceUrl, setResourceUrl] =
    useState("");
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

    if (
      postType === "resource" &&
      !resourceUrl.trim()
    ) {
      setError(
        "Please add a link for this resource."
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
          ai_tool:
            postType === "prompt" &&
            aiTool.trim()
              ? aiTool.trim()
              : null,
          resource_url:
            postType === "resource" &&
            resourceUrl.trim()
              ? resourceUrl.trim()
              : null,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-white/40 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Create a Post
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(
              [
                {
                  value: "discussion",
                  label: "💬 Discussion",
                },
                {
                  value: "question",
                  label: "💡 Question",
                },
                {
                  value: "prompt",
                  label: "✨ Prompt",
                },
                {
                  value: "learning",
                  label: "📘 Learning",
                },
                {
                  value: "resource",
                  label: "🔗 Resource",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setPostType(
                    option.value
                  )
                }
                className={`rounded-xl border px-2 py-2 text-xs transition ${
                  postType ===
                  option.value
                    ? "border-brand bg-brand text-zinc-900"
                    : "border-zinc-300 text-zinc-400"
                }`}
              >
                {option.label}
              </button>
            ))}
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
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-zinc-300 text-zinc-400"
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
                : postType === "prompt"
                  ? "Name your prompt"
                  : postType ===
                      "resource"
                    ? "What is this resource?"
                    : postType ===
                        "learning"
                      ? "What are you explaining?"
                      : "What do you want to talk about?"
            }
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
          />

          {postType === "prompt" && (
            <input
              value={aiTool}
              onChange={(e) =>
                setAiTool(
                  e.target.value
                )
              }
              placeholder="Which AI tool is this for? (e.g. Midjourney, Veo)"
              className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
            />
          )}

          {postType === "resource" && (
            <input
              value={resourceUrl}
              onChange={(e) =>
                setResourceUrl(
                  e.target.value
                )
              }
              placeholder="Link to the article, video, or tool"
              className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
            />
          )}

          <textarea
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
            rows={6}
            placeholder={
              postType === "prompt"
                ? "Paste the full prompt text..."
                : postType ===
                    "resource"
                  ? "What's useful about it?"
                  : "Add details..."
            }
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
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
            className="mt-4 w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
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
