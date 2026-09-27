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

export type StyleTheme = {
  preset: string;
  background: string;
  surface: string;
  ink: string;
  accent: string;
  accent2: string;
};

export type StyleFontKey =
  | "modern"
  | "grotesk"
  | "trendy"
  | "editorial"
  | "softserif"
  | "rounded"
  | "display"
  | "mono";

export const STYLE_FONTS: { key: StyleFontKey; label: string; hint: string }[] = [
  { key: "modern", label: "Modern", hint: "Clean sans (Geist)" },
  { key: "grotesk", label: "Grotesk", hint: "Techy sans (Space Grotesk)" },
  { key: "trendy", label: "Trendy", hint: "Quirky sans (Bricolage)" },
  { key: "editorial", label: "Editorial", hint: "Magazine serif (Playfair)" },
  { key: "softserif", label: "Soft serif", hint: "Warm serif (Fraunces)" },
  { key: "rounded", label: "Rounded", hint: "Friendly (Nunito)" },
  { key: "display", label: "Bold display", hint: "Wide & loud (Syne)" },
  { key: "mono", label: "Mono", hint: "Code look (JetBrains Mono)" },
];

// Ready-made colour themes. "custom" keeps whatever colours were
// picked by hand.
export const STYLE_THEME_PRESETS: (StyleTheme & { label: string })[] = [
  { preset: "paper", label: "Paper", background: "#F6F3EC", surface: "#FAF8F3", ink: "#14263A", accent: "#C2412D", accent2: "#3D7C8C" },
  { preset: "brand", label: "AI Cheatbook", background: "#F3F8FC", surface: "#FFFFFF", ink: "#0B1B2B", accent: "#0077A3", accent2: "#00ABE4" },
  { preset: "lavender", label: "Lavender", background: "#F5F3FF", surface: "#FBFAFF", ink: "#1E1B4B", accent: "#7C3AED", accent2: "#DB2777" },
  { preset: "blush", label: "Blush", background: "#FFF1F2", surface: "#FFF8F8", ink: "#3B0A1E", accent: "#E11D48", accent2: "#9333EA" },
  { preset: "mint", label: "Mint", background: "#ECFDF5", surface: "#F7FFFB", ink: "#052E2B", accent: "#059669", accent2: "#0284C7" },
  { preset: "midnight", label: "Midnight", background: "#0E1320", surface: "#151B2C", ink: "#EEF2FF", accent: "#F472B6", accent2: "#38D6FF" },
  { preset: "noir", label: "Noir", background: "#111111", surface: "#1A1A1A", ink: "#F5F5F5", accent: "#FACC15", accent2: "#A3E635" },
];

export const DEFAULT_THEME: StyleTheme = {
  preset: "paper",
  background: "#F6F3EC",
  surface: "#FAF8F3",
  ink: "#14263A",
  accent: "#C2412D",
  accent2: "#3D7C8C",
};

export type GallerySettings = {
  theme: StyleTheme;
  headingFont: StyleFontKey;
  bodyFont: StyleFontKey;
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
  theme: DEFAULT_THEME,
  headingFont: "modern",
  bodyFont: "modern",
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

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function fontKey(value: unknown): StyleFontKey {
  return STYLE_FONTS.some((f) => f.key === value)
    ? (value as StyleFontKey)
    : "modern";
}

function parseTheme(raw: unknown): StyleTheme {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    preset: text(obj.preset) || DEFAULT_THEME.preset,
    background: hex(obj.background, DEFAULT_THEME.background),
    surface: hex(obj.surface, DEFAULT_THEME.surface),
    ink: hex(obj.ink, DEFAULT_THEME.ink),
    accent: hex(obj.accent, DEFAULT_THEME.accent),
    accent2: hex(obj.accent2, DEFAULT_THEME.accent2),
  };
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
    theme: parseTheme(obj.theme),
    headingFont: fontKey(obj.headingFont),
    bodyFont: fontKey(obj.bodyFont),
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

// The 060 migration hasn't been run (or Supabase hasn't reloaded
// its schema yet): Postgres reports "undefined column" (42703) on
// reads, and the Supabase API reports PGRST204 ("Could not find
// the '…' column … in the schema cache") on inserts and updates.
export function isMissingColumnError(
  error: { code?: string; message?: string } | null
): boolean {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        /column .* does not exist/i.test(error.message || "") ||
        /could not find the .* column/i.test(error.message || ""))
  );
}
