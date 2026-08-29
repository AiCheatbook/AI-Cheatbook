import type { Metadata } from "next";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

export const SITE_NAME = "AI Cheatbook";

/*
 * Set NEXT_PUBLIC_SITE_URL in your
 * environment (and in Hostinger) to
 * https://aicheatbook.com
 *
 * Falls back to the live domain so
 * canonical URLs and OG images are never
 * broken relative paths.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://aicheatbook.com"
).replace(/\/$/, "");

type SeoRow = {
  title?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  image_alt_text?: string | null;
  is_indexed?: boolean | null;

  // Fallback sources
  excerpt?: string | null;
  summary?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  media_url?: string | null;
  media_source?: string | null;
  published_at?: string | null;
  author?: string | null;
};

function absoluteUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${SITE_URL}${
    url.startsWith("/") ? "" : "/"
  }${url}`;
}

function truncate(
  value: string,
  max = 160
): string {
  const clean = value
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean.length > max
    ? `${clean.slice(0, max - 1).trimEnd()}…`
    : clean;
}

/*
 * Builds full Next.js metadata for a
 * content page, preferring the SEO fields
 * an editor filled in and falling back to
 * the content itself so no page is ever
 * left with a duplicate or empty title.
 */

export function buildContentMetadata(
  row: SeoRow,
  path: string
): Metadata {
  const title =
    row.meta_title?.trim() ||
    row.title?.trim() ||
    SITE_NAME;

  const descriptionSource =
    row.meta_description?.trim() ||
    row.excerpt?.trim() ||
    row.summary?.trim() ||
    row.description?.trim() ||
    "";

  const description = descriptionSource
    ? truncate(descriptionSource)
    : undefined;

  const canonical =
    row.canonical_url?.trim() ||
    `${SITE_URL}${path}`;

  const ogImage = absoluteUrl(
    row.og_image_url?.trim() ||
      resolveThumbnailUrl(
        row.thumbnail_url,
        row.cover_image_url ||
          row.media_url,
        row.media_source
      )
  );

  const keywords = row.meta_keywords
    ?.split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const indexable =
    row.is_indexed !== false;

  return {
    title,
    description,
    keywords:
      keywords && keywords.length > 0
        ? keywords
        : undefined,

    alternates: {
      canonical,
    },

    robots: indexable
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: false,
        },

    openGraph: {
      title:
        row.og_title?.trim() || title,
      description:
        row.og_description?.trim() ||
        description,
      url: canonical,
      siteName: SITE_NAME,
      type: "article",
      images: ogImage
        ? [
            {
              url: ogImage,
              alt:
                row.image_alt_text?.trim() ||
                title,
            },
          ]
        : undefined,
    },

    twitter: {
      card: ogImage
        ? "summary_large_image"
        : "summary",
      title:
        row.og_title?.trim() || title,
      description:
        row.og_description?.trim() ||
        description,
      images: ogImage
        ? [ogImage]
        : undefined,
    },
  };
}

/*
 * Simpler version for static listing
 * pages (e.g. /news, /learning) that
 * don't come from a database row.
 */

export function buildPageMetadata(options: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonical = `${SITE_URL}${options.path}`;

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: options.title,
      description: options.description,
    },
  };
}
