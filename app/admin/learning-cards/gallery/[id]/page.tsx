"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImagePlus,
  Library,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import {
  DEFAULT_GALLERY_SETTINGS,
  isMissingColumnError,
  parseGallerySettings,
  parseItemDetails,
  type GallerySettings,
} from "@/lib/cms/styleLibrary";

/*
 * Prompt Style Page editor — creates ("/gallery/new") and edits
 * Learning Cards with card_type "prompt_gallery". Items are
 * stored in learning_card_prompts; on save the card's rows are
 * replaced with the current list, in order.
 */

type EditorItem = {
  key: string;
  kind: "library" | "manual";
  libraryId: string | null;
  title: string;
  promptText: string;
  mediaType: "image" | "hosted_video";
  mediaUrl: string;
  extraImages: string[];
  category: string;
  description: string;
  featured: boolean;
};

type LibraryOption = {
  id: string;
  title: string;
  prompt: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
};

const MISSING_COLUMNS_NOTE =
  "Saved, but the extra design details (headline accent, stats, descriptions, featured) need a one-time database update: run database/060_prompt_style_pages.sql in the Supabase SQL Editor, then save again.";

const inputBase =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand";
const inputClass = `mt-1 w-full ${inputBase}`;

function newKey() {
  return `item-${crypto.randomUUID()}`;
}

function blankItem(): EditorItem {
  return {
    key: newKey(),
    kind: "manual",
    libraryId: null,
    title: "",
    promptText: "",
    mediaType: "image",
    mediaUrl: "",
    extraImages: [],
    category: "",
    description: "",
    featured: false,
  };
}

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug || "prompt-style-page";
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-700">{label}</span>
      {hint && <span className="ml-1 text-xs text-zinc-400">— {hint}</span>}
      {children}
    </label>
  );
}

export default function PromptStylePageEditor() {
  const params = useParams();
  const router = useRouter();
  const routeId = typeof params?.id === "string" ? params.id : "new";
  const isNew = routeId === "new";

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(!isNew);
  const [cardId, setCardId] = useState<string | null>(
    isNew ? null : routeId
  );
  const [slug, setSlug] = useState("");

  // Page fields
  const [eyebrow, setEyebrow] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateLabel, setTemplateLabel] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [settings, setSettings] = useState<GallerySettings>(
    DEFAULT_GALLERY_SETTINGS
  );

  const [items, setItems] = useState<EditorItem[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Library picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryOption[]>([]);

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const knownCategories = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => i.category.trim()).filter(Boolean))
      ),
    [items]
  );

  function updateSettings(patch: Partial<GallerySettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function updateItem(key: string, patch: Partial<EditorItem>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }

  /*
   * ADMIN CHECK + LOAD
   */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      if (cancelled) return;
      setChecking(false);

      if (isNew) return;

      const cardColumns: string =
        "id, slug, title, summary, category, card_type, is_published, published_at, gallery_eyebrow, gallery_how_to_use, gallery_template_url, gallery_template_label";

      let cardRes = await supabase
        .from("learning_cards")
        .select(`${cardColumns}, gallery_settings`)
        .eq("id", routeId)
        .single();

      if (isMissingColumnError(cardRes.error)) {
        cardRes = await supabase
          .from("learning_cards")
          .select(cardColumns)
          .eq("id", routeId)
          .single();
      }

      const itemColumns: string = `
        sort_order, library_item_id, item_category, extra_media_urls,
        custom_title, custom_prompt_text, custom_media_type, custom_media_url,
        library_items ( id, title, prompt, media_type, media_url, thumbnail_url )
      `;

      const itemsQuery = (columns: string) =>
        supabase
          .from("learning_card_prompts")
          .select(columns)
          .eq("learning_card_id", routeId)
          .order("sort_order", { ascending: true });

      let itemsRes = await itemsQuery(`${itemColumns}, item_details`);

      if (isMissingColumnError(itemsRes.error)) {
        itemsRes = await itemsQuery(itemColumns);
      }

      if (cancelled) return;

      if (cardRes.error || !cardRes.data) {
        setError(cardRes.error?.message || "Page not found.");
        setLoading(false);
        return;
      }

      const card = cardRes.data as unknown as Record<string, unknown>;

      if (card.card_type !== "prompt_gallery") {
        router.replace(`/admin/learning-cards/${routeId}`);
        return;
      }

      setSlug((card.slug as string) || "");
      setEyebrow((card.gallery_eyebrow as string) || "");
      setTitle((card.title as string) || "");
      setSummary((card.summary as string) || "");
      setCategory((card.category as string) || "");
      setHowToUse((card.gallery_how_to_use as string) || "");
      setTemplateUrl((card.gallery_template_url as string) || "");
      setTemplateLabel((card.gallery_template_label as string) || "");
      setIsPublished(Boolean(card.is_published));
      setPublishedAt((card.published_at as string) || null);
      setSettings(parseGallerySettings(card.gallery_settings));

      type Row = {
        library_item_id: string | null;
        item_category: string | null;
        extra_media_urls: string[] | null;
        custom_title: string | null;
        custom_prompt_text: string | null;
        custom_media_type: string | null;
        custom_media_url: string | null;
        item_details?: unknown;
        library_items: LibraryOption | null;
      };

      setItems(
        ((itemsRes.data || []) as unknown as Row[]).map((row) => {
          const details = parseItemDetails(row.item_details);
          const lib = row.library_items;

          return {
            key: newKey(),
            kind: row.library_item_id ? "library" : "manual",
            libraryId: row.library_item_id,
            title: lib?.title || row.custom_title || "",
            promptText: lib?.prompt || row.custom_prompt_text || "",
            mediaType:
              (lib?.media_type || row.custom_media_type) === "hosted_video"
                ? "hosted_video"
                : "image",
            mediaUrl:
              lib?.media_url || lib?.thumbnail_url || row.custom_media_url || "",
            extraImages: row.extra_media_urls || [],
            category: row.item_category || "",
            description: details.description,
            featured: details.featured,
          };
        })
      );

      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [isNew, routeId, router]);

  /*
   * LIBRARY PICKER
   */

  async function searchLibrary(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    const { data } = await supabase
      .from("library_items")
      .select("id, title, prompt, media_type, media_url, thumbnail_url")
      .ilike("title", `%${value.trim()}%`)
      .limit(12);

    setResults((data || []) as LibraryOption[]);
  }

  function addFromLibrary(option: LibraryOption) {
    setItems((prev) => [
      ...prev,
      {
        ...blankItem(),
        kind: "library",
        libraryId: option.id,
        title: option.title,
        promptText: option.prompt || "",
        mediaType:
          option.media_type === "hosted_video" ? "hosted_video" : "image",
        mediaUrl: option.media_url || option.thumbnail_url || "",
      },
    ]);
  }

  function addBlank() {
    const item = blankItem();
    setItems((prev) => [...prev, item]);
    setOpenKey(item.key);
  }

  function move(index: number, delta: 1 | -1) {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    // Keep the hero pointing at the same item.
    setSettings((prev) => {
      if (prev.featuredIndex === index) {
        return { ...prev, featuredIndex: index + delta };
      }
      if (prev.featuredIndex === index + delta) {
        return { ...prev, featuredIndex: index };
      }
      return prev;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSettings((prev) => {
      if (prev.featuredIndex === null) return prev;
      if (prev.featuredIndex === index) return { ...prev, featuredIndex: null };
      if (prev.featuredIndex > index) {
        return { ...prev, featuredIndex: prev.featuredIndex - 1 };
      }
      return prev;
    });
  }

  /*
   * UPLOADS
   */

  async function handleImages(
    key: string,
    files: FileList | null,
    target: "main" | "extra"
  ) {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setUploadingKey(key);
    setError("");

    try {
      const urls = await Promise.all(list.map(uploadFile));
      setItems((prev) =>
        prev.map((item) => {
          if (item.key !== key) return item;
          if (target === "main") {
            const [first, ...rest] = urls;
            return {
              ...item,
              mediaUrl: first,
              mediaType: list[0].type.startsWith("video/")
                ? "hosted_video"
                : "image",
              extraImages: [...item.extraImages, ...rest],
            };
          }
          return { ...item, extraImages: [...item.extraImages, ...urls] };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleTemplate(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingKey("template");
    try {
      setTemplateUrl(await uploadFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  /*
   * SAVE
   */

  async function save(publish: boolean) {
    setError("");
    setNotice("");

    if (!title.trim()) {
      setError("Add a page title.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one style.");
      return;
    }
    const untitled = items.findIndex((i) => !i.title.trim());
    if (untitled !== -1) {
      setError(`Style #${untitled + 1} needs a title.`);
      setOpenKey(items[untitled].key);
      return;
    }

    setSaving(true);

    try {
      const featured =
        (settings.featuredIndex !== null && items[settings.featuredIndex]) ||
        items.find((i) => i.featured) ||
        items[0];

      const cleanSettings: GallerySettings = {
        ...settings,
        stats: settings.stats.filter((s) => s.value.trim() || s.label.trim()),
      };

      const nextPublishedAt =
        publish && !publishedAt ? new Date().toISOString() : publishedAt;

      const cardFields = {
        title: title.trim(),
        summary: summary.trim() || null,
        category: category.trim() || null,
        card_type: "prompt_gallery",
        cover_image_url: featured.mediaUrl || null,
        gallery_eyebrow: eyebrow.trim() || null,
        gallery_how_to_use: howToUse.trim() || null,
        gallery_template_url: templateUrl.trim() || null,
        gallery_template_label: templateLabel.trim() || null,
        is_published: publish,
        published_at: publish ? nextPublishedAt : publishedAt,
      };

      let missingColumns = false;
      let id = cardId;
      let savedSlug = slug;

      const writeCard = async (withSettings: boolean) => {
        const fields = withSettings
          ? { ...cardFields, gallery_settings: cleanSettings }
          : cardFields;

        if (id) {
          return supabase.from("learning_cards").update(fields).eq("id", id);
        }

        savedSlug = await ensureUniqueSlug(generateSlug(title));
        const newId = crypto.randomUUID();
        const result = await supabase
          .from("learning_cards")
          .insert({ id: newId, slug: savedSlug, ...fields });
        if (!result.error) id = newId;
        return result;
      };

      let cardResult = await writeCard(true);
      if (isMissingColumnError(cardResult.error)) {
        missingColumns = true;
        cardResult = await writeCard(false);
      }
      if (cardResult.error) throw new Error(cardResult.error.message);
      if (!id) throw new Error("Could not save the page.");

      // Replace the item rows.
      const { error: deleteError } = await supabase
        .from("learning_card_prompts")
        .delete()
        .eq("learning_card_id", id);

      if (deleteError) throw new Error(deleteError.message);

      const { count: remaining } = await supabase
        .from("learning_card_prompts")
        .select("learning_card_id", { count: "exact", head: true })
        .eq("learning_card_id", id);

      if (remaining) {
        throw new Error(
          "The database didn't allow replacing this page's styles. Run database/060_prompt_style_pages.sql in the Supabase SQL Editor once, then save again."
        );
      }

      const rows = items.map((item, index) => {
        const base = {
          learning_card_id: id,
          sort_order: index,
          item_category: item.category.trim() || null,
          extra_media_urls: item.extraImages,
        };

        return item.kind === "library"
          ? { ...base, library_item_id: item.libraryId }
          : {
              ...base,
              library_item_id: null,
              custom_title: item.title.trim(),
              custom_prompt_text: item.promptText.trim() || null,
              custom_media_type: item.mediaType,
              custom_media_url: item.mediaUrl || null,
            };
      });

      const withDetails = rows.map((row, index) => ({
        ...row,
        item_details: {
          description: items[index].description.trim(),
          featured: items[index].featured,
        },
      }));

      let insertResult = await supabase
        .from("learning_card_prompts")
        .insert(missingColumns ? rows : withDetails);

      if (!missingColumns && isMissingColumnError(insertResult.error)) {
        missingColumns = true;
        insertResult = await supabase.from("learning_card_prompts").insert(rows);
      }
      if (insertResult.error) throw new Error(insertResult.error.message);

      setCardId(id);
      setSlug(savedSlug);
      setIsPublished(publish);
      setPublishedAt(cardFields.published_at);
      setNotice(
        missingColumns
          ? MISSING_COLUMNS_NOTE
          : publish
            ? "Saved and published."
            : "Saved as draft."
      );

      if (isNew) {
        router.replace(`/admin/learning-cards/gallery/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (checking || loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-zinc-200" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-28 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/admin/learning-cards"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Learning Cards
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "New Prompt Style Page" : "Edit Prompt Style Page"}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              A showcase page: big headline, stats, a featured style, and a
              searchable library of styles with images and copyable prompts.
            </p>
          </div>
          {slug && isPublished && (
            <a
              href={`/learning/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text"
            >
              View live page <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <Section
            title="1. Top of the page"
            hint="The big headline area visitors see first."
          >
            <Field label="Small label above the headline" hint="e.g. OPENART CHARACTER STUDY · 2026">
              <input
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Headline" hint="bold part">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dan + Vinny,"
                  className={inputClass}
                />
              </Field>
              <Field label="Headline accent" hint="shown in italic colour">
                <input
                  value={settings.headlineAccent}
                  onChange={(e) =>
                    updateSettings({ headlineAccent: e.target.value })
                  }
                  placeholder="differently."
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Intro text">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </Field>

            <div>
              <p className="text-xs font-semibold text-zinc-700">
                Stats <span className="font-normal text-zinc-400">— e.g. “35” · “Paired styles”</span>
              </p>
              <div className="mt-2 space-y-2">
                {settings.stats.map((stat, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={stat.value}
                      onChange={(e) =>
                        updateSettings({
                          stats: settings.stats.map((s, j) =>
                            j === i ? { ...s, value: e.target.value } : s
                          ),
                        })
                      }
                      placeholder="35"
                      className={`${inputBase} w-24 shrink-0`}
                    />
                    <input
                      value={stat.label}
                      onChange={(e) =>
                        updateSettings({
                          stats: settings.stats.map((s, j) =>
                            j === i ? { ...s, label: e.target.value } : s
                          ),
                        })
                      }
                      placeholder="Paired styles"
                      className={`${inputBase} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          stats: settings.stats.filter((_, j) => j !== i),
                        })
                      }
                      aria-label="Remove stat"
                      className="rounded-lg px-2 text-zinc-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {settings.stats.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      stats: [...settings.stats, { value: "", label: "" }],
                    })
                  }
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-text"
                >
                  <Plus className="h-4 w-4" /> Add stat
                </button>
              )}
            </div>

            <Field
              label="Learning Cards category"
              hint="used in the Learning listing and homepage rows"
            >
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section
            title="2. Library section"
            hint="The heading above the grid of styles."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Small label">
                <input
                  value={settings.libraryEyebrow}
                  onChange={(e) =>
                    updateSettings({ libraryEyebrow: e.target.value })
                  }
                  placeholder="The paired style library"
                  className={inputClass}
                />
              </Field>
              <Field label="Heading">
                <input
                  value={settings.libraryHeading}
                  onChange={(e) =>
                    updateSettings({ libraryHeading: e.target.value })
                  }
                  placeholder="Compare, inspect or copy."
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Text beside the heading">
              <textarea
                value={settings.libraryText}
                onChange={(e) => updateSettings({ libraryText: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </Field>
            <Field
              label="Prompt box label"
              hint="shown on every prompt box"
            >
              <input
                value={settings.promptLabel}
                onChange={(e) => updateSettings({ promptLabel: e.target.value })}
                placeholder="Reusable prompt · OpenArt GPT Image 2"
                className={inputClass}
              />
            </Field>
          </Section>

          <Section
            title="3. How to use (optional)"
            hint="A tip bar above the styles, with an optional download."
          >
            <Field label="Instructions">
              <textarea
                value={howToUse}
                onChange={(e) => setHowToUse(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Download button text">
                <input
                  value={templateLabel}
                  onChange={(e) => setTemplateLabel(e.target.value)}
                  placeholder="Download 4K template"
                  className={inputClass}
                />
              </Field>
              <div>
                <span className="text-xs font-semibold text-zinc-700">
                  Download file
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={templateUrl}
                    onChange={(e) => setTemplateUrl(e.target.value)}
                    placeholder="Paste a link or upload"
                    className={`${inputBase} min-w-0 flex-1`}
                  />
                  <label className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-brand">
                    {uploadingKey === "template" ? "Uploading…" : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleTemplate(e.target.files)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title={`4. Styles (${items.length})`}
            hint="Each style shows up to 3 images side by side, a title, a short description and a copyable prompt. Use the star to feature one in the top showcase."
          >
            {items.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                No styles yet — add one below.
              </p>
            )}

            <ol className="space-y-3">
              {items.map((item, index) => {
                const open = openKey === item.key;
                const isHero = settings.featuredIndex === index;
                const images = [item.mediaUrl, ...item.extraImages].filter(
                  Boolean
                );

                return (
                  <li
                    key={item.key}
                    className={`rounded-xl border bg-white ${
                      open ? "border-brand/50 shadow-sm" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-zinc-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {images.slice(0, 3).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-full min-w-0 flex-1 object-cover"
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? null : item.key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold">
                          {item.title || "Untitled style"}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {[
                            item.category,
                            item.kind === "library" ? "From Prompt Library" : null,
                            item.featured ? "Featured" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Click to edit"}
                        </p>
                      </button>
                      <button
                        type="button"
                        title={isHero ? "Shown in the top showcase" : "Show in the top showcase"}
                        onClick={() =>
                          updateSettings({ featuredIndex: isHero ? null : index })
                        }
                        className={`rounded-lg p-1.5 ${
                          isHero ? "text-amber-500" : "text-zinc-300 hover:text-amber-500"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${isHero ? "fill-amber-400" : ""}`} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move up"
                        onClick={() => move(index, -1)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        onClick={() => move(index, 1)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                        disabled={index === items.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={open ? "Collapse" : "Expand"}
                        onClick={() => setOpenKey(open ? null : item.key)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900"
                      >
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {open && (
                      <div className="space-y-4 border-t border-zinc-100 p-4">
                        <div>
                          <span className="text-xs font-semibold text-zinc-700">
                            Images{" "}
                            <span className="font-normal text-zinc-400">
                              — up to 3 show side by side (e.g. front · back · face)
                            </span>
                          </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {images.map((url, i) => (
                              <div
                                key={`${url}-${i}`}
                                className="group relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-full w-full object-cover" />
                                {i === 0 && (
                                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                                    MAIN
                                  </span>
                                )}
                                {(i > 0 || item.kind === "manual") && (
                                  <button
                                    type="button"
                                    aria-label="Remove image"
                                    onClick={() =>
                                      i === 0
                                        ? updateItem(item.key, {
                                            mediaUrl: item.extraImages[0] || "",
                                            extraImages: item.extraImages.slice(1),
                                          })
                                        : updateItem(item.key, {
                                            extraImages: item.extraImages.filter(
                                              (_, j) => j !== i - 1
                                            ),
                                          })
                                    }
                                    className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-0.5 text-red-500 group-hover:block"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-brand hover:text-brand-text">
                              <ImagePlus className="h-5 w-5" />
                              {uploadingKey === item.key ? "Uploading…" : "Add images"}
                              <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                  handleImages(
                                    item.key,
                                    e.target.files,
                                    item.mediaUrl || item.kind === "library"
                                      ? "extra"
                                      : "main"
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Style name">
                            <input
                              value={item.title}
                              disabled={item.kind === "library"}
                              onChange={(e) =>
                                updateItem(item.key, { title: e.target.value })
                              }
                              placeholder="Rubber Hose"
                              className={`${inputClass} disabled:bg-zinc-50 disabled:text-zinc-500`}
                            />
                          </Field>
                          <Field label="Type / filter tab" hint="e.g. 2D, 3D, Anime">
                            <input
                              value={item.category}
                              list="style-categories"
                              onChange={(e) =>
                                updateItem(item.key, { category: e.target.value })
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <Field label="Short description" hint="one line">
                          <input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.key, { description: e.target.value })
                            }
                            placeholder="Elastic rhythm, pie-cut forms and vintage ink."
                            className={inputClass}
                          />
                        </Field>

                        <Field
                          label="Prompt"
                          hint={
                            item.kind === "library"
                              ? "edit this in the Prompt Library"
                              : "visitors can copy this"
                          }
                        >
                          <textarea
                            value={item.promptText}
                            disabled={item.kind === "library"}
                            onChange={(e) =>
                              updateItem(item.key, { promptText: e.target.value })
                            }
                            rows={8}
                            className={`${inputClass} font-mono text-xs disabled:bg-zinc-50 disabled:text-zinc-500`}
                          />
                        </Field>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="checkbox"
                              checked={item.featured}
                              onChange={(e) =>
                                updateItem(item.key, { featured: e.target.checked })
                              }
                              className="h-4 w-4 accent-[#00ABE4]"
                            />
                            Show a “Featured” tag on this card
                          </label>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" /> Remove style
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <datalist id="style-categories">
              {knownCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addBlank}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                <Plus className="h-4 w-4" /> Add new style
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-brand"
              >
                <Library className="h-4 w-4" /> Add from Prompt Library
              </button>
            </div>

            {pickerOpen && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <input
                  value={query}
                  onChange={(e) => searchLibrary(e.target.value)}
                  placeholder="Search your Prompt Library by title…"
                  className={`w-full ${inputBase}`}
                  autoFocus
                />
                <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {results.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => addFromLibrary(option)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-white"
                      >
                        {(option.thumbnail_url || option.media_url) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.thumbnail_url || option.media_url || ""}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <span className="flex-1 truncate">{option.title}</span>
                        <Plus className="h-4 w-4 text-brand-text" />
                      </button>
                    </li>
                  ))}
                  {query.trim() && results.length === 0 && (
                    <li className="p-2 text-sm text-zinc-500">No matches.</li>
                  )}
                </ul>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Save bar */}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : notice ? (
              <p className={notice === MISSING_COLUMNS_NOTE ? "text-amber-600" : "text-green-600"}>
                {notice}
              </p>
            ) : (
              <p className="text-zinc-500">
                {isPublished ? "Published" : "Draft"} · {items.length}{" "}
                {items.length === 1 ? "style" : "styles"}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(false)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
          >
            {isPublished ? "Unpublish & save" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(true)}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : isPublished ? "Save changes" : "Save & publish"}
          </button>
        </div>
      </div>
    </main>
  );
}
