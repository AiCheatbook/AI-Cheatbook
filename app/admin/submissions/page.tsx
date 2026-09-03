"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type PromptSubmission = {
  id: string;
  submitted_by: string;
  title: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  type: string | null;
  ai_tools: string[] | null;
  created_at: string;
};

type LearningCardSubmission = {
  id: string;
  submitted_by: string;
  title: string;
  summary: string | null;
  content_html: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminSubmissionsPage() {
  const [tab, setTab] = useState<
    "prompts" | "learning-cards"
  >("prompts");

  const [prompts, setPrompts] = useState<
    PromptSubmission[]
  >([]);
  const [learningCards, setLearningCards] =
    useState<LearningCardSubmission[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setError("");

    const [
      promptResponse,
      cardResponse,
    ] = await Promise.all([
      supabase
        .from("prompt_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: true,
        }),
      supabase
        .from(
          "learning_card_submissions"
        )
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (
      promptResponse.error ||
      cardResponse.error
    ) {
      setError(
        promptResponse.error?.message ||
          cardResponse.error?.message ||
          "Failed to load submissions."
      );
      setLoading(false);
      return;
    }

    setPrompts(
      (promptResponse.data ||
        []) as PromptSubmission[]
    );
    setLearningCards(
      (cardResponse.data ||
        []) as LearningCardSubmission[]
    );
    setLoading(false);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function getSubmitterName(
    userId: string
  ): Promise<string> {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .single();

    return (
      data?.display_name ||
      data?.email ||
      "Community Member"
    );
  }

  async function handleApprovePrompt(
    submission: PromptSubmission
  ) {
    setProcessingId(submission.id);
    setError("");

    try {
      const authorName =
        await getSubmitterName(
          submission.submitted_by
        );

      const { error: insertError } =
        await supabase
          .from("library_items")
          .insert({
            id: crypto.randomUUID(),
            title: submission.title,
            slug: generateSlug(
              submission.title
            ),
            type:
              submission.type || "prompt",
            category:
              submission.category ||
              "text",
            description:
              submission.description,
            prompt:
              submission.prompt_text,
            ai_tools:
              submission.ai_tools || [],
            author_name: authorName,
            is_published: true,
            is_featured: false,
            is_trending: false,
            published_at:
              new Date().toISOString(),
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const { error: updateError } =
        await supabase
          .from("prompt_submissions")
          .update({
            status: "approved",
            reviewed_at:
              new Date().toISOString(),
          })
          .eq("id", submission.id);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setPrompts((current) =>
        current.filter(
          (p) => p.id !== submission.id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve prompt."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectPrompt(
    id: string
  ) {
    setProcessingId(id);

    const { error: updateError } =
      await supabase
        .from("prompt_submissions")
        .update({
          status: "rejected",
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", id);

    if (!updateError) {
      setPrompts((current) =>
        current.filter(
          (p) => p.id !== id
        )
      );
    }

    setProcessingId(null);
  }

  async function handleApproveLearningCard(
    submission: LearningCardSubmission
  ) {
    setProcessingId(submission.id);
    setError("");

    try {
      const authorName =
        await getSubmitterName(
          submission.submitted_by
        );

      const { error: insertError } =
        await supabase
          .from("learning_cards")
          .insert({
            id: crypto.randomUUID(),
            title: submission.title,
            slug: generateSlug(
              submission.title
            ),
            summary: submission.summary,
            content_html:
              submission.content_html,
            category:
              submission.category,
            tags: submission.tags || [],
            author: authorName,
            is_published: true,
            is_featured: false,
            published_at:
              new Date().toISOString(),
          });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const { error: updateError } =
        await supabase
          .from(
            "learning_card_submissions"
          )
          .update({
            status: "approved",
            reviewed_at:
              new Date().toISOString(),
          })
          .eq("id", submission.id);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setLearningCards((current) =>
        current.filter(
          (c) => c.id !== submission.id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve learning card."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectLearningCard(
    id: string
  ) {
    setProcessingId(id);

    const { error: updateError } =
      await supabase
        .from(
          "learning_card_submissions"
        )
        .update({
          status: "rejected",
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", id);

    if (!updateError) {
      setLearningCards((current) =>
        current.filter(
          (c) => c.id !== id
        )
      );
    }

    setProcessingId(null);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-text">
          Admin
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Submissions
        </h1>

        <p className="mt-2 text-zinc-600">
          Review content submitted by
          registered users before it goes
          live.
        </p>

        <div className="mt-6 flex gap-4 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setTab("prompts")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === "prompts"
                ? "border-brand text-zinc-900"
                : "border-transparent text-zinc-600 hover:text-zinc-600"
            }`}
          >
            Prompts ({prompts.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setTab("learning-cards")
            }
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              tab === "learning-cards"
                ? "border-brand text-zinc-900"
                : "border-transparent text-zinc-600 hover:text-zinc-600"
            }`}
          >
            Learning Cards (
            {learningCards.length})
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-white p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        )}

        {!loading &&
          tab === "prompts" &&
          prompts.length === 0 && (
            <p className="mt-8 text-center text-zinc-600">
              No pending prompt
              submissions.
            </p>
          )}

        {!loading &&
          tab === "prompts" && (
            <div className="mt-6 space-y-4">
              {prompts.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5"
                >
                  <h2 className="font-semibold text-zinc-900">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-xs text-zinc-600">
                    {item.type} ·{" "}
                    {item.category}
                    {item.ai_tools &&
                      item.ai_tools
                        .length > 0 &&
                      ` · ${item.ai_tools.join(", ")}`}
                  </p>

                  {item.description && (
                    <p className="mt-2 text-sm text-zinc-600">
                      {item.description}
                    </p>
                  )}

                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm text-zinc-600">
                    {item.prompt_text}
                  </p>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      disabled={
                        processingId ===
                        item.id
                      }
                      onClick={() =>
                        handleApprovePrompt(
                          item
                        )
                      }
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve & Publish
                    </button>

                    <button
                      type="button"
                      disabled={
                        processingId ===
                        item.id
                      }
                      onClick={() =>
                        handleRejectPrompt(
                          item.id
                        )
                      }
                      className="rounded-lg border border-red-900/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        {!loading &&
          tab === "learning-cards" &&
          learningCards.length === 0 && (
            <p className="mt-8 text-center text-zinc-600">
              No pending learning card
              submissions.
            </p>
          )}

        {!loading &&
          tab === "learning-cards" && (
            <div className="mt-6 space-y-4">
              {learningCards.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-5"
                  >
                    <h2 className="font-semibold text-zinc-900">
                      {item.title}
                    </h2>

                    <p className="mt-1 text-xs text-zinc-600">
                      {item.category}
                      {item.tags &&
                        item.tags
                          .length > 0 &&
                        ` · ${item.tags.join(", ")}`}
                    </p>

                    {item.summary && (
                      <p className="mt-2 text-sm text-zinc-600">
                        {item.summary}
                      </p>
                    )}

                    <div
                      className="prose prose-invert prose-sm mt-3 max-h-64 overflow-y-auto rounded-xl bg-white p-3"
                      dangerouslySetInnerHTML={{
                        __html:
                          item.content_html ||
                          "",
                      }}
                    />

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        disabled={
                          processingId ===
                          item.id
                        }
                        onClick={() =>
                          handleApproveLearningCard(
                            item
                          )
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve & Publish
                      </button>

                      <button
                        type="button"
                        disabled={
                          processingId ===
                          item.id
                        }
                        onClick={() =>
                          handleRejectLearningCard(
                            item.id
                          )
                        }
                        className="rounded-lg border border-red-900/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </main>
  );
}
