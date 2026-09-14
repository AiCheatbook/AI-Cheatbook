"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type LibraryPromptOption = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  media_url: string | null;
};

type GalleryItem =
  | {
      kind: "library";
      key: string;
      id: string;
      title: string;
      thumbnailUrl: string | null;
      mediaUrl: string | null;
      category: string;
      extraImages: string[];
    }
  | {
      kind: "manual";
      key: string;
      title: string;
      promptText: string;
      mediaType: "image" | "hosted_video";
      mediaUrl: string;
      category: string;
      extraImages: string[];
    };

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data } = await supabase
      .from("learning_cards")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Upload failed.");
  }

  return result.url as string;
}

export default function LearningCardFromPromptsPage() {
  // Page-level / hero fields
  const [eyebrow, setEyebrow] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [templateUploading, setTemplateUploading] = useState(false);

  // Library search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryPromptOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<GalleryItem[]>([]);

  // Manual entry form
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualPromptText, setManualPromptText] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualMediaType, setManualMediaType] = useState<
    "image" | "hosted_video"
  >("image");
  const [manualMediaUrl, setManualMediaUrl] = useState("");
  const [manualExtraImages, setManualExtraImages] = useState<string[]>([]);
  const [manualUploading, setManualUploading] = useState(false);
  const [manualUploadError, setManualUploadError] = useState("");

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

    setResults((data || []) as LibraryPromptOption[]);
    setSearching(false);
  }

  function addLibraryPrompt(prompt: LibraryPromptOption) {
    if (selected.some((p) => p.kind === "library" && p.id === prompt.id)) {
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        kind: "library",
        key: `lib-${prompt.id}`,
        id: prompt.id,
        title: prompt.title,
        thumbnailUrl: prompt.thumbnail_url,
        mediaUrl: prompt.media_url,
        category: "",
        extraImages: [],
      },
    ]);
  }

  async function handleTemplateUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateUploading(true);
    try {
      setTemplateUrl(await uploadFile(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setTemplateUploading(false);
    }
  }

  async function handleManualMainUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setManualUploading(true);
    setManualUploadError("");

    try {
      setManualMediaUrl(await uploadFile(file));
    } catch (err) {
      setManualUploadError(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setManualUploading(false);
    }
  }

  async function handleManualExtraUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setManualUploading(true);
    setManualUploadError("");

    try {
      const urls = await Promise.all(files.map(uploadFile));
      setManualExtraImages((prev) => [...prev, ...urls]);
    } catch (err) {
      setManualUploadError(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setManualUploading(false);
    }
  }

  function addManualPrompt() {
    if (!manualTitle.trim() || !manualMediaUrl.trim()) return;

    setSelected((prev) => [
      ...prev,
      {
        kind: "manual",
        key: `manual-${Date.now()}`,
        title: manualTitle.trim(),
        promptText: manualPromptText.trim(),
        mediaType: manualMediaType,
        mediaUrl: manualMediaUrl.trim(),
        category: manualCategory.trim(),
        extraImages: manualExtraImages,
      },
    ]);

    setManualTitle("");
    setManualPromptText("");
    setManualCategory("");
    setManualMediaUrl("");
    setManualExtraImages([]);
    setManualOpen(false);
  }

  function removeItem(key: string) {
    setSelected((prev) => prev.filter((p) => p.key !== key));
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

  function updateItemCategory(key: string, value: string) {
    setSelected((prev) =>
      prev.map((item) => (item.key === key ? { ...item, category: value } : item))
    );
  }

  async function handleCreate() {
    if (!title.trim() || selected.length === 0) return;

    setSaving(true);
    setError("");

    try {
      const slug = await ensureUniqueSlug(generateSlug(title));
      const cardId = crypto.randomUUID();

      const firstThumb =
        selected[0].kind === "library"
          ? selected[0].thumbnailUrl || selected[0].mediaUrl
          : selected[0].mediaUrl;

      const { error: cardError } = await supabase
        .from("learning_cards")
        .insert({
          id: cardId,
          title: title.trim(),
          slug,
          summary: summary.trim() || null,
          category: category.trim() || null,
          card_type: "prompt_gallery",
          cover_image_url: firstThumb || null,
          gallery_eyebrow: eyebrow.trim() || null,
          gallery_how_to_use: howToUse.trim() || null,
          gallery_template_url: templateUrl.trim() || null,
          gallery_template_label: templateLabel.trim() || null,
          is_published: false,
          published_at: null,
        });

      if (cardError) {
        throw new Error(cardError.message);
      }

      const rows = selected.map((item, index) =>
        item.kind === "library"
          ? {
              learning_card_id: cardId,
              library_item_id: item.id,
              sort_order: index,
              item_category: item.category.trim() || null,
              extra_media_urls: item.extraImages,
            }
          : {
              learning_card_id: cardId,
              library_item_id: null,
              sort_order: index,
              custom_title: item.title,
              custom_prompt_text: item.promptText || null,
              custom_media_type: item.mediaType,
              custom_media_url: item.mediaUrl,
              item_category: item.category.trim() || null,
              extra_media_urls: item.extraImages,
            }
      );

      const { error: linkError } = await supabase
        .from("learning_card_prompts")
        .insert(rows);

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
          <h1 className="text-xl font-bold">Gallery page created</h1>
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
          Create Prompt Gallery Page
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          A complete browsable page: hero header, search and category
          filters, an optional &quot;how to use&quot; guide, and a grid of
          prompts — each with its own image(s), pulled from your Library or
          entered manually.
        </p>

        {/* HERO */}
        <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-zinc-900">Page Header</p>

          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-600">
                Eyebrow label (optional)
              </label>
              <input
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder="e.g. THE STYLE LIBRARY"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline for this page"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600">
                Description (optional)
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600">
                Category (optional, for the main Learning Cards listing)
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* HOW TO USE */}
        <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            How to Use (optional)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Shown as a highlighted instructional banner near the top of the
            page.
          </p>

          <textarea
            value={howToUse}
            onChange={(e) => setHowToUse(e.target.value)}
            rows={3}
            placeholder="Explain how someone should use these prompts..."
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={templateLabel}
              onChange={(e) => setTemplateLabel(e.target.value)}
              placeholder="Download button label (e.g. Download Template)"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="flex items-center gap-2">
              <input
                value={templateUrl}
                onChange={(e) => setTemplateUrl(e.target.value)}
                placeholder="Template file URL"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <label className="shrink-0 cursor-pointer rounded-lg border border-dashed border-zinc-300 px-2.5 py-2 text-xs text-zinc-600 hover:border-brand/50">
                {templateUploading ? "..." : "Upload"}
                <input
                  type="file"
                  onChange={handleTemplateUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>

        {/* LIBRARY SEARCH */}
        <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            Add from Prompt Library
          </p>
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
                  onClick={() => addLibraryPrompt(p)}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MANUAL ENTRY */}
        <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">
              Add a manual entry
            </p>
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="text-xs font-semibold text-brand-text"
            >
              {manualOpen ? "Cancel" : "+ Add Manually"}
            </button>
          </div>

          {manualOpen && (
            <div className="mt-3 space-y-3">
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              <textarea
                value={manualPromptText}
                onChange={(e) => setManualPromptText(e.target.value)}
                placeholder="Prompt text (optional)"
                rows={3}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              <input
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                placeholder="Category tag (optional, e.g. 2D, 3D, Other) — used for filtering"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />

              <div className="flex items-center gap-3">
                <select
                  value={manualMediaType}
                  onChange={(e) =>
                    setManualMediaType(
                      e.target.value as "image" | "hosted_video"
                    )
                  }
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-brand"
                >
                  <option value="image">Image</option>
                  <option value="hosted_video">Video</option>
                </select>

                <label className="cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-brand/50">
                  {manualUploading
                    ? "Uploading..."
                    : manualMediaUrl
                      ? "Replace main image/video"
                      : "Choose main image/video..."}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleManualMainUpload}
                    className="sr-only"
                  />
                </label>

                {manualMediaUrl && (
                  <span className="text-xs text-green-600">Uploaded ✓</span>
                )}
              </div>

              <div>
                <label className="cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-brand/50">
                  {manualUploading
                    ? "Uploading..."
                    : "+ Add extra panel image(s)"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleManualExtraUpload}
                    className="sr-only"
                  />
                </label>
                {manualExtraImages.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {manualExtraImages.length} extra image(s) added
                  </p>
                )}
              </div>

              {manualUploadError && (
                <p className="text-xs text-red-600">{manualUploadError}</p>
              )}

              <button
                type="button"
                disabled={!manualTitle.trim() || !manualMediaUrl.trim()}
                onClick={addManualPrompt}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-50"
              >
                Add to Gallery
              </button>
            </div>
          )}
        </div>

        {/* SELECTED LIST */}
        {selected.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-zinc-900">
              Selected ({selected.length}) — this order is how they&apos;ll
              appear
            </p>
            <div className="mt-2 space-y-1.5">
              {selected.map((item, i) => (
                <div
                  key={item.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2"
                >
                  <span className="text-xs text-zinc-400">{i + 1}</span>
                  <span className="min-w-[120px] flex-1 truncate text-sm text-zinc-900">
                    {item.title}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
                    {item.kind === "library" ? "Library" : "Manual"}
                  </span>
                  <input
                    value={item.category}
                    onChange={(e) =>
                      updateItemCategory(item.key, e.target.value)
                    }
                    placeholder="Category tag"
                    className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-brand"
                  />
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
                    onClick={() => removeItem(item.key)}
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
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!title.trim() || selected.length === 0 || saving}
          onClick={handleCreate}
          className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Gallery Page"}
        </button>
      </div>
    </main>
  );
}
