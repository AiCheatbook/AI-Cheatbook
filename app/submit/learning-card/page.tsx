"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import RichTextEditor from "@/components/cms/RichTextEditor";

export default function SubmitLearningCardPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [title, setTitle] = useState("");
  const [summary, setSummary] =
    useState("");
  const [contentHtml, setContentHtml] =
    useState("");
  const [category, setCategory] =
    useState("");
  const [tags, setTags] = useState("");

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
          "/login?redirect=/submit/learning-card"
        );
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  async function handleSubmit() {
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
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
          "Please log in to submit a learning card."
        );
      }

      const { error: insertError } =
        await supabaseAuthClient
          .from(
            "learning_card_submissions"
          )
          .insert({
            submitted_by: user.id,
            title: title.trim(),
            summary:
              summary.trim() || null,
            content_html: contentHtml,
            category:
              category.trim() || null,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
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
          : "Failed to submit learning card."
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
            your learning card before it
            goes live on the site.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/account/submissions"
              className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              View My Submissions
            </Link>

            <Link
              href="/learning"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-brand-dark"
            >
              Browse Learning Cards
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
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">
          Submit a Learning Card
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Write an educational article for
          the community. It'll be
          reviewed before publishing.
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
            placeholder="e.g. What is a Diffusion Model?"
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Summary{" "}
            <span className="text-zinc-400">
              (optional)
            </span>
          </label>
          <textarea
            value={summary}
            onChange={(e) =>
              setSummary(e.target.value)
            }
            rows={2}
            placeholder="A short summary..."
            className={inputClass}
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-400">
              Category{" "}
              <span className="text-zinc-400">
                (optional)
              </span>
            </label>
            <input
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value
                )
              }
              placeholder="e.g. Machine Learning"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400">
              Tags{" "}
              <span className="text-zinc-400">
                (comma separated)
              </span>
            </label>
            <input
              value={tags}
              onChange={(e) =>
                setTags(e.target.value)
              }
              placeholder="ai, models, basics"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400">
            Content
          </label>

          <div className="mt-2">
            <RichTextEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Write your article here..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-8 w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : "Submit for Review"}
        </button>
      </div>
    </main>
  );
}
