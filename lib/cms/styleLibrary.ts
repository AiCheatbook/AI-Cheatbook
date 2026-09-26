/*
 * Shared types and helpers for Prompt Style Pages — Learning
 * Cards with card_type "prompt_gallery". Extra design details
 * live in two jsonb columns (see database/060_prompt_style_pages.sql):
 * learning_cards.gallery_settings and
 * learning_card_prompts.item_details.
 */

export type StyleStat = {
  value: string;
  label: string;
};

export type GallerySettings = {
  headlineAccent: string;
  stats: StyleStat[];
  libraryEyebrow: string;
  libraryHeading: string;
  libraryText: string;
  promptLabel: string;
  featuredIndex: number | null;
};

export type ItemDetails = {
  description: string;
  featured: boolean;
};

export type StyleItem = {
  key: string;
  slug: string | null;
  title: string;
  promptText: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  extraImages: string[];
  description: string;
  featured: boolean;
};

export const DEFAULT_GALLERY_SETTINGS: GallerySettings = {
  headlineAccent: "",
  stats: [],
  libraryEyebrow: "",
  libraryHeading: "",
  libraryText: "",
  promptLabel: "",
  featuredIndex: null,
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseGallerySettings(raw: unknown): GallerySettings {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const stats = Array.isArray(obj.stats)
    ? (obj.stats as unknown[])
        .map((s) => {
          const stat =
            s && typeof s === "object" ? (s as Record<string, unknown>) : {};
          return { value: text(stat.value), label: text(stat.label) };
        })
        .filter((s) => s.value || s.label)
    : [];

  return {
    headlineAccent: text(obj.headlineAccent),
    stats,
    libraryEyebrow: text(obj.libraryEyebrow),
    libraryHeading: text(obj.libraryHeading),
    libraryText: text(obj.libraryText),
    promptLabel: text(obj.promptLabel),
    featuredIndex:
      typeof obj.featuredIndex === "number" ? obj.featuredIndex : null,
  };
}

export function parseItemDetails(raw: unknown): ItemDetails {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    description: text(obj.description),
    featured: obj.featured === true,
  };
}

// Postgres "undefined column" — the 060 migration hasn't been run.
export function isMissingColumnError(
  error: { code?: string; message?: string } | null
): boolean {
  return Boolean(
    error &&
      (error.code === "42703" ||
        /column .* does not exist/i.test(error.message || ""))
  );
}
