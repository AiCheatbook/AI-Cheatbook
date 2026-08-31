"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "prompt_help", label: "Prompt Help" },
  { value: "feedback", label: "Feedback" },
  { value: "bug_report", label: "Bug Report" },
  { value: "showcase", label: "Showcase" },
];

export default function NewPollPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);
  const [question, setQuestion] =
    useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("general");
  const [multipleChoice, setMultipleChoice] =
    useState(false);
  const [expiresIn, setExpiresIn] =
    useState("none");
  const [options, setOptions] = useState([
    "",
    "",
  ]);
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
          "/login?redirect=/community/polls/new"
        );
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  function updateOption(
    index: number,
    value: string
  ) {
    setOptions((current) =>
      current.map((o, i) =>
        i === index ? value : o
      )
    );
  }

  function addOption() {
    if (options.length >= 6) {
      return;
    }

    setOptions((current) => [
      ...current,
      "",
    ]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) {
      return;
    }

    setOptions((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    const cleanOptions = options
      .map((o) => o.trim())
      .filter(Boolean);

    if (!question.trim()) {
      setError("A question is required.");
      return;
    }

    if (cleanOptions.length < 2) {
      setError(
        "Please provide at least 2 options."
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
          "Please log in to create a poll."
        );
      }

      let expiresAt: string | null = null;

      if (expiresIn !== "none") {
        const days = parseInt(
          expiresIn,
          10
        );
        const date = new Date();
        date.setDate(
          date.getDate() + days
        );
        expiresAt = date.toISOString();
      }

      const {
        data: poll,
        error: pollError,
      } = await supabaseAuthClient
        .from("community_polls")
        .insert({
          user_id: user.id,
          question: question.trim(),
          description:
            description.trim() || null,
          category,
          is_multiple_choice:
            multipleChoice,
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      if (pollError) {
        throw new Error(
          pollError.message
        );
      }

      const { error: optionsError } =
        await supabaseAuthClient
          .from(
            "community_poll_options"
          )
          .insert(
            cleanOptions.map(
              (text, index) => ({
                poll_id: poll.id,
                option_text: text,
                sort_order: index,
              })
            )
          );

      if (optionsError) {
        throw new Error(
          optionsError.message
        );
      }

      router.push(
        `/community/polls/${poll.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create poll."
      );
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return null;
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-orange-500";

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl"
      >
        <h1 className="text-2xl font-bold">
          📊 Create a Poll
        </h1>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="text-sm font-medium text-zinc-300">
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
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-300">
            Question
          </label>
          <input
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            placeholder="Which AI video generator gives you the best results?"
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-300">
            Description{" "}
            <span className="text-zinc-600">
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
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-300">
            Options{" "}
            <span className="text-zinc-600">
              (2-6)
            </span>
          </label>

          <div className="mt-2 space-y-2">
            {options.map((option, i) => (
              <div
                key={i}
                className="flex gap-2"
              >
                <input
                  value={option}
                  onChange={(e) =>
                    updateOption(
                      i,
                      e.target.value
                    )
                  }
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white outline-none focus:border-orange-500"
                />

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeOption(i)
                    }
                    className="rounded-xl border border-zinc-800 px-3 text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-orange-500 hover:text-orange-400"
            >
              + Add option
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-300">
              Mode
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setMultipleChoice(false)
                }
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                  !multipleChoice
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                Single Choice
              </button>
              <button
                type="button"
                onClick={() =>
                  setMultipleChoice(true)
                }
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                  multipleChoice
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                Multiple Choice
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300">
              Expires
            </label>
            <select
              value={expiresIn}
              onChange={(e) =>
                setExpiresIn(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="none">
                Never
              </option>
              <option value="1">
                1 day
              </option>
              <option value="7">
                1 week
              </option>
              <option value="30">
                1 month
              </option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting
            ? "Creating..."
            : "Create Poll"}
        </button>
      </form>
    </main>
  );
}
