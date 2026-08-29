import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/seo/metadata";

/*
 * Rebuilt periodically so newly published
 * content appears without a redeploy.
 */

export const revalidate = 3600;

type SitemapRow = {
  slug: string;
  published_at: string | null;
  is_indexed?: boolean | null;
};

async function fetchRows(
  table: string
): Promise<SitemapRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select(
      "slug, published_at, is_indexed"
    )
    .eq("is_published", true);

  if (error) {
    console.error(
      `Sitemap: failed to load ${table}:`,
      error.message
    );

    return [];
  }

  return (data || []) as SitemapRow[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap =
    [
      {
        url: `${SITE_URL}/`,
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${SITE_URL}/news`,
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/learning`,
        changeFrequency: "weekly",
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/search`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${SITE_URL}/generator`,
        changeFrequency: "monthly",
        priority: 0.7,
      },
      {
        url: `${SITE_URL}/community`,
        changeFrequency: "weekly",
        priority: 0.6,
      },
    ];

  const [news, learning, prompts] =
    await Promise.all([
      fetchRows("news"),
      fetchRows("learning_cards"),
      fetchRows("library_items"),
    ]);

  function toEntries(
    rows: SitemapRow[],
    prefix: string,
    priority: number
  ): MetadataRoute.Sitemap {
    return rows
      .filter(
        (row) =>
          row.slug &&
          row.is_indexed !== false
      )
      .map((row) => ({
        url: `${SITE_URL}${prefix}/${row.slug}`,
        lastModified: row.published_at
          ? new Date(row.published_at)
          : undefined,
        changeFrequency:
          "weekly" as const,
        priority,
      }));
  }

  return [
    ...staticRoutes,
    ...toEntries(news, "/news", 0.8),
    ...toEntries(
      learning,
      "/learning",
      0.8
    ),
    ...toEntries(
      prompts,
      "/prompt",
      0.7
    ),
  ];
}
