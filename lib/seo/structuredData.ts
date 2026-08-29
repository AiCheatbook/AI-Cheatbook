import { SITE_NAME, SITE_URL } from "./metadata";

type ArticleRow = {
  title?: string | null;
  meta_title?: string | null;
  excerpt?: string | null;
  summary?: string | null;
  meta_description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  media_url?: string | null;
  og_image_url?: string | null;
  author?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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

/*
 * "Article" for News, "TechArticle" for
 * Learning Cards — Google treats
 * TechArticle favorably for how-to /
 * reference content.
 */

export function buildArticleSchema(
  row: ArticleRow,
  path: string,
  type: "Article" | "TechArticle" = "Article"
) {
  const title =
    row.meta_title?.trim() ||
    row.title?.trim() ||
    SITE_NAME;

  const description =
    row.meta_description?.trim() ||
    row.excerpt?.trim() ||
    row.summary?.trim() ||
    undefined;

  const image = absoluteUrl(
    row.og_image_url ||
      row.cover_image_url ||
      row.thumbnail_url ||
      row.media_url
  );

  const url = `${SITE_URL}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": type,
    headline: title,
    description,
    image: image ? [image] : undefined,
    author: {
      "@type": "Organization",
      name: row.author?.trim() || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.ico`,
      },
    },
    datePublished:
      row.published_at || undefined,
    dateModified:
      row.updated_at ||
      row.published_at ||
      undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })
    ),
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
  };
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input":
        "required name=search_term_string",
    },
  };
}

/*
 * For individual prompts — a lighter
 * CreativeWork schema (prompts aren't
 * articles or products).
 */

export function buildCreativeWorkSchema(
  row: ArticleRow & {
    category?: string | null;
  },
  path: string
) {
  const title =
    row.meta_title?.trim() ||
    row.title?.trim() ||
    SITE_NAME;

  const description =
    row.meta_description?.trim() ||
    row.excerpt?.trim() ||
    row.summary?.trim() ||
    undefined;

  const image = absoluteUrl(
    row.og_image_url ||
      row.thumbnail_url ||
      row.media_url
  );

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description,
    image: image || undefined,
    genre: row.category || undefined,
    dateCreated:
      row.created_at || undefined,
    dateModified:
      row.updated_at || undefined,
    url: `${SITE_URL}${path}`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}
