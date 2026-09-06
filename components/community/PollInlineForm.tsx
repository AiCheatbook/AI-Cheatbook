"use client";

import { useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "prompt_help", label: "Prompt Help" },
  { value: "feedback", label: "Feedback" },
  { value: "bug_report", label: "Bug Report" },
  { value: "showcase", label: "Showcase" },
];

type PollInlineFormProps = {
  groupId?: string;
  onDone: () => void;
};

export default function PollInlineForm({
  groupId,
  onDone,
}: PollInlineFormProps) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [expiresIn, setExpiresIn] = useState("none");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((o, i) => (i === index ? value : o))
    );
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((current) => [...current, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!question.trim()) {
      setError("Give your poll a question.");
      return;
    }

    const cleanOptions = options
      .map((o) => o.trim())
      .filter(Boolean);

    if (cleanOptions.length < 2) {
      setError("Add at least 2 answer options.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabaseAuthClient.auth.getUser();

      if (!user) {
        throw new Error("Please log in to create a poll.");
      }

      let expiresAt: string | null = null;

      if (expiresIn !== "none") {
        const days = parseInt(expiresIn, 10);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const { data: poll, error: pollError } = await supabaseAuthClient
        .from("community_polls")
        .insert({
          user_id: user.id,
          question: question.trim(),
          description: description.trim() || null,
          category,
          is_multiple_choice: multipleChoice,
          expires_at: expiresAt,
          group_id: groupId || null,
        })
        .select("id")
        .single();

      if (pollError || !poll) {
        throw new Error(pollError?.message || "Failed to create poll.");
      }

      const { error: optionsError } = await supabaseAuthClient
        .from("community_poll_options")
        .insert(
          cleanOptions.map((text, index) => ({
            poll_id: poll.id,
            option_text: text,
            sort_order: index,
          }))
        );

      if (optionsError) {
        throw new Error(optionsError.message);
      }

      onDone();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong creating your poll."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Add context (optional)"
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-brand"
      />

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="rounded-xl border border-zinc-300 px-3 text-zinc-500 hover:border-red-400 hover:text-red-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {options.length < 6 && (
          <button
            type="button"
            onClick={addOption}
            className="text-xs font-medium text-brand-text hover:underline"
          >
            + Add option
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={expiresIn}
          onChange={(e) => setExpiresIn(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
        >
          <option value="none">Never expires</option>
          <option value="1">Expires in 1 day</option>
          <option value="7">Expires in 7 days</option>
        </select>

        <label className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={multipleChoice}
            onChange={(e) => setMultipleChoice(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Multiple choice
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Creating Poll..." : "Create Poll"}
      </button>
    </form>
  );
}
