"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type SavedPrompt = {
  id: string;
  title: string | null;
  prompt_text: string;
  ai_tool: string | null;
  created_at: string;
};

export default function SavedPromptsPage() {
  const router = useRouter();

  const [prompts, setPrompts] = useState<
    SavedPrompt[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [showAddForm, setShowAddForm] =
    useState(false);
  const [manualTitle, setManualTitle] =
    useState("");
  const [manualText, setManualText] =
    useState("");
  const [manualTool, setManualTool] =
    useState("");
  const [adding, setAdding] =
    useState(false);
  const [addError, setAddError] =
    useState("");

  useEffect(() => {
    async function loadPrompts() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/account/saved-prompts"
        );
        return;
      }

      const { data, error } =
        await supabaseAuthClient
          .from("saved_prompts")
          .select(
            `
              id,
              title,
              prompt_text,
              ai_tool,
              created_at
            `
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setPrompts(
        (data || []) as SavedPrompt[]
      );
      setLoading(false);
    }

    loadPrompts();
  }, [router]);

  async function handleManualAdd(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setAddError("");

    if (!manualText.trim()) {
      setAddError(
        "Prompt text is required."
      );
      return;
    }

    setAdding(true);

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setAddError(
          "Please log in to save prompts."
        );
        return;
      }

      const { data, error: insertError } =
        await supabaseAuthClient
          .from("saved_prompts")
          .insert({
            user_id: user.id,
            title:
              manualTitle.trim() ||
              "Saved prompt",
            prompt_text:
              manualText.trim(),
            ai_tool:
              manualTool.trim() || null,
          })
          .select(
            "id, title, prompt_text, ai_tool, created_at"
          )
          .single();

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setPrompts((current) => [
        data as SavedPrompt,
        ...current,
      ]);

      setManualTitle("");
      setManualText("");
      setManualTool("");
      setShowAddForm(false);
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : "Failed to save prompt."
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this saved prompt?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabaseAuthClient
      .from("saved_prompts")
      .delete()
      .eq("id", id);

    if (!error) {
      setPrompts((current) =>
        current.filter(
          (p) => p.id !== id
        )
      );
    }
  }

  async function handleCopy(
    id: string,
    text: string
  ) {
    await navigator.clipboard.writeText(
      text
    );

    setCopiedId(id);

    window.setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Account
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            My Prompts
          </h1>

          <button
            type="button"
            onClick={() =>
              setShowAddForm(
                (v) => !v
              )
            }
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {showAddForm
              ? "Cancel"
              : "+ Add Prompt"}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleManualAdd}
            className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Title{" "}
                <span className="text-zinc-600">
                  (optional)
                </span>
              </label>
              <input
                value={manualTitle}
                onChange={(e) =>
                  setManualTitle(
                    e.target.value
                  )
                }
                placeholder="e.g. My favorite Midjourney prompt"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-zinc-300">
                Prompt Text
              </label>
              <textarea
                value={manualText}
                onChange={(e) =>
                  setManualText(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Paste or type any prompt you want to save..."
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-zinc-300">
                AI Tool{" "}
                <span className="text-zinc-600">
                  (optional)
                </span>
              </label>
              <input
                value={manualTool}
                onChange={(e) =>
                  setManualTool(
                    e.target.value
                  )
                }
                placeholder="e.g. Midjourney"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            {addError && (
              <p className="mt-3 text-sm text-red-400">
                {addError}
              </p>
            )}

            <button
              type="submit"
              disabled={adding}
              className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {adding
                ? "Saving..."
                : "Save Prompt"}
            </button>
          </form>
        )}

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-2xl border border-red-900/50 bg-zinc-900 p-6">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          prompts.length === 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="text-zinc-400">
                No saved prompts yet.
              </p>

              <Link
                href="/generator"
                className="mt-4 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Go to Generator
              </Link>
            </div>
          )}

        {!loading &&
          !error &&
          prompts.length > 0 && (
            <div className="mt-6 space-y-4">
              {prompts.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-white">
                        {item.title ||
                          "Saved prompt"}
                      </h2>

                      {item.ai_tool && (
                        <span className="mt-1 inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          {item.ai_tool}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            item.id,
                            item.prompt_text
                          )
                        }
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        {copiedId ===
                        item.id
                          ? "✓ Copied"
                          : "Copy"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            item.id
                          )
                        }
                        className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                    {item.prompt_text}
                  </p>
                </div>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
