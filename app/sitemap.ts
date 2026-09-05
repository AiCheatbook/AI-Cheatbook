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

type GroupSitemapRow = {
  slug: string;
  created_at: string | null;
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

/*
 * Only PUBLIC communities go in the sitemap — an invite-only
 * community shouldn't become discoverable via Google just
 * because it exists, even though its actual content is already
 * separately protected by RLS regardless of this.
 */
async function fetchPublicGroups(): Promise<GroupSitemapRow[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("slug, created_at")
    .eq("visibility", "public")
    .is("deleted_at", null);

  if (error) {
    console.error(
      "Sitemap: failed to load groups:",
      error.message
    );

    return [];
  }

  return (data || []) as GroupSitemapRow[];
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
        url: `${SITE_URL}/groups`,
        changeFrequency: "daily",
        priority: 0.7,
      },
    ];

  const [news, learning, prompts, publicGroups] =
    await Promise.all([
      fetchRows("news"),
      fetchRows("learning_cards"),
      fetchRows("library_items"),
      fetchPublicGroups(),
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
    ...publicGroups.map((g) => ({
      url: `${SITE_URL}/groups/${g.slug}`,
      lastModified: g.created_at
        ? new Date(g.created_at)
        : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
