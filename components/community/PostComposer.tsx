"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import {
  awardCommunityPoints,
  POINTS_FOR_POST,
} from "@/lib/community/awardPoints";
import MediaUploader, {
  type MediaValue,
} from "@/components/community/MediaUploader";
import PollInlineForm from "@/components/community/PollInlineForm";
import ArtworkInlineForm from "@/components/community/ArtworkInlineForm";
import {
  TYPE_OPTIONS,
  type PostType,
} from "@/components/community/postTypeOptions";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "prompt_help", label: "Prompt Help" },
  { value: "feedback", label: "Feedback" },
  { value: "bug_report", label: "Bug Report" },
  { value: "showcase", label: "Showcase" },
];

// All 8 types now compose inline, right here in the same
// popup — Poll and Share Work used to route away to their own
// standalone pages; they now reuse that same insert logic via
// PollInlineForm/ArtworkInlineForm instead, so every option
// behaves the same way (pick a tile, fill it in, submit).

type PostComposerProps = {
  onClose: () => void;
  isLoggedIn: boolean;
  groupId?: string;
  initialType?: PostType;
};

export default function PostComposer({
  onClose,
  isLoggedIn,
  groupId,
  initialType,
}: PostComposerProps) {
  const router = useRouter();

  const [step, setStep] = useState<"type" | "compose">(
    initialType ? "compose" : "type"
  );
  const [postType, setPostType] = useState<PostType>(
    initialType || "discussion"
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aiTool, setAiTool] = useState("");
  const [category, setCategory] = useState("general");
  const [media, setMedia] = useState<MediaValue>({
    mode: "images",
    imageUrls: [],
    videoUrl: null,
    youtubeUrl: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function selectType(value: (typeof TYPE_OPTIONS)[number]) {
    setPostType(value.value);
    setStep("compose");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError("Title and details are both required.");
      return;
    }

    if (!isLoggedIn) {
      setError("Please log in to post.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseAuthClient.auth.getUser();

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

      const { data: myProfile } = await supabaseAuthClient
        .from("profiles")
        .select("is_disabled")
        .eq("id", user.id)
        .single();

      if (myProfile?.is_disabled) {
        throw new Error(
          "Your account has been disabled and can't post right now. Contact support if you think this is a mistake."
        );
      }

      const { data: inserted, error: insertError } = await supabaseAuthClient
        .from("community_threads")
        .insert({
          user_id: user.id,
          title: title.trim(),
          body: body.trim(),
          category,
          content_kind: postType,
          ai_tool:
            postType === "prompt" && aiTool.trim() ? aiTool.trim() : null,
          resource_url: null,
          media_urls: media.imageUrls,
          video_url: media.videoUrl,
          youtube_url: media.youtubeUrl,
          group_id: groupId || null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Save failed: ${insertError.message}`);
      }

      if (!inserted || !inserted.id) {
        throw new Error(
          "The post didn't save correctly — no confirmation was returned from the server. Please try again, and if this keeps happening, let support know."
        );
      }

      const { data: verifyRow, error: verifyError } = await supabaseAuthClient
        .from("community_threads")
        .select("id")
        .eq("id", inserted.id)
        .maybeSingle();

      if (verifyError || !verifyRow) {
        throw new Error(
          "Your post was created but couldn't be confirmed as saved. Please refresh and check if it appears before posting again."
        );
      }

      if (groupId) {
        await awardCommunityPoints(groupId, user.id, POINTS_FOR_POST);
        onClose();
      } else {
        router.push(`/discussions/${inserted.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while posting. Please try again."
      );
      console.error("Post creation failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-white/40 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {step === "type" ? "Share your AI thoughts?" : "Create a Post"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-600 hover:text-zinc-900"
          >
            ✕
          </button>
        </div>

        {step === "type" && (
          <div className="mt-4">
            <p className="text-sm text-zinc-600">
              What do you want to share with the community?
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectType(option)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-zinc-300 px-3 py-4 text-xs text-zinc-600 transition hover:border-brand hover:text-brand-text"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${option.color}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "compose" && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setStep("type")}
              className="text-xs text-zinc-600 hover:text-brand-text"
            >
              ← Change post type
            </button>

            {postType === "poll" ? (
              <div className="mt-3">
                <PollInlineForm
                  groupId={groupId}
                  onDone={async () => {
                    if (groupId) {
                      const {
                        data: { user },
                      } = await supabaseAuthClient.auth.getUser();

                      if (user) {
                        await awardCommunityPoints(
                          groupId,
                          user.id,
                          POINTS_FOR_POST
                        );
                      }
                    }
                    onClose();
                  }}
                />
              </div>
            ) : postType === "work" ? (
              <div className="mt-3">
                <ArtworkInlineForm
                  onDone={async () => {
                    if (groupId) {
                      const {
                        data: { user },
                      } = await supabaseAuthClient.auth.getUser();

                      if (user) {
                        await awardCommunityPoints(
                          groupId,
                          user.id,
                          POINTS_FOR_POST
                        );
                      }
                    }
                    onClose();
                  }}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        category === c.value
                          ? "border-brand bg-brand/10 text-brand-text"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    postType === "question"
                      ? "What's your question?"
                      : postType === "prompt"
                        ? "Name your prompt"
                        : "What do you want to talk about?"
                  }
                  className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
                />

                {postType === "prompt" && (
                  <input
                    value={aiTool}
                    onChange={(e) => setAiTool(e.target.value)}
                    placeholder="Which AI tool is this for? (e.g. Midjourney, Veo)"
                    className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
                  />
                )}

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder={
                    postType === "prompt"
                      ? "Paste the full prompt text..."
                      : "Add details..."
                  }
                  className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
                />

                <MediaUploader onChange={setMedia} />

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
                  {submitting ? "Posting..." : "Post"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
