"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type PromptOption = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_url: string | null;
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function LearningCardFromPromptsPage() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PromptOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<PromptOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function search(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from("library_items")
      .select("id, title, thumbnail_url, media_url")
      .ilike("title", `%${value}%`)
      .limit(10);

    setResults((data || []) as PromptOption[]);
    setSearching(false);
  }

  function addPrompt(prompt: PromptOption) {
    if (selected.some((p) => p.id === prompt.id)) return;
    setSelected((prev) => [...prev, prompt]);
  }

  function removePrompt(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setSelected((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim() || selected.length === 0) return;

    setSaving(true);
    setError("");

    try {
      const slug = generateSlug(title);
      const cardId = crypto.randomUUID();

      const { error: cardError } = await supabase
        .from("learning_cards")
        .insert({
          id: cardId,
          title: title.trim(),
          slug,
          summary: summary.trim() || null,
          category: category.trim() || null,
          card_type: "prompt_gallery",
          cover_image_url:
            selected[0]?.thumbnail_url || selected[0]?.media_url || null,
          is_published: false,
          published_at: null,
        });

      if (cardError) {
        throw new Error(cardError.message);
      }

      const { error: linkError } = await supabase
        .from("learning_card_prompts")
        .insert(
          selected.map((prompt, index) => ({
            learning_card_id: cardId,
            library_item_id: prompt.id,
            sort_order: index,
          }))
        );

      if (linkError) {
        throw new Error(linkError.message);
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-xl font-bold">Gallery card created</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Saved as a draft under Learning Cards. Publish it whenever
            you&apos;re ready.
          </p>
          <Link
            href="/admin/learning-cards"
            className="mt-4 inline-block text-brand-text"
          >
            ← Back to Learning Cards
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/learning-cards"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Learning Cards
        </Link>

        <h1 className="mt-2 text-2xl font-bold">
          Create Learning Card from Prompts
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Groups several existing prompts onto one page for side-by-side
          browsing — useful for showing the same idea rendered a few
          different ways. Saves as a normal Learning Card, so it shows up
          wherever Learning Cards already do.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Five Lighting Styles, One Scene"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Summary (optional)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Category (optional)
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full max-w-xs rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">
              Add prompts
            </label>
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search prompts by title..."
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />

            {searching && (
              <p className="mt-1.5 text-xs text-zinc-400">Searching...</p>
            )}

            {results.length > 0 && (
              <div className="mt-1.5 overflow-hidden rounded-xl border border-zinc-200">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPrompt(p)}
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Selected ({selected.length}) — this order is how they&apos;ll
                appear
              </p>
              <div className="mt-2 space-y-1.5">
                {selected.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2"
                  >
                    <span className="text-xs text-zinc-400">{i + 1}</span>
                    <span className="flex-1 truncate text-sm text-zinc-900">
                      {p.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      className="text-xs text-zinc-400 hover:text-zinc-900"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      className="text-xs text-zinc-400 hover:text-zinc-900"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removePrompt(p.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!title.trim() || selected.length === 0 || saving}
            onClick={handleCreate}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Gallery Card"}
          </button>
        </div>
      </div>
    </main>
  );
}
