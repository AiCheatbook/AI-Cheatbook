import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

/*
 * The homepage "Top 10": up to ten news stories and Learning Cards
 * picked at /admin/top-ten, in order. Stored as its own row in the
 * site_settings table (id "top_ten"), shape:
 *   { "items": [{ "type": "learning_card", "id": "…" }, …] }
 */

export const TOP_TEN_ID = "top_ten";
export const TOP_TEN_MAX = 10;

export type TopTenType = "news" | "learning_card";

export type TopTenRef = {
  type: TopTenType;
  id: string;
};

export type TopTenEntry = TopTenRef & {
  title: string;
  category: string | null;
  imageUrl: string | null;
  href: string;
};

export function parseTopTen(raw: unknown): TopTenRef[] {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  if (!Array.isArray(obj.items)) return [];

  return (obj.items as unknown[])
    .map((item) => {
      const ref =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
      return {
        type: ref.type === "news" ? "news" : "learning_card",
        id: typeof ref.id === "string" ? ref.id : "",
      } as TopTenRef;
    })
    .filter((ref) => ref.id)
    .slice(0, TOP_TEN_MAX);
}

type ContentRow = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  media_source: string | null;
};

const CONTENT_COLUMNS =
  "id, title, slug, category, cover_image_url, thumbnail_url, media_source";

/*
 * Resolves the picked items to titles, images and links, keeping
 * the chosen order and skipping anything unpublished or deleted.
 * Works with any Supabase client (public on the homepage, the
 * admin's own client in the CMS).
 */
export async function resolveTopTen(
  refs: TopTenRef[],
  client: SupabaseClient = supabase
): Promise<TopTenEntry[]> {
  const newsIds = refs.filter((r) => r.type === "news").map((r) => r.id);
  const lessonIds = refs
    .filter((r) => r.type === "learning_card")
    .map((r) => r.id);

  const [newsRes, lessonRes] = await Promise.all([
    newsIds.length
      ? client
          .from("news")
          .select(CONTENT_COLUMNS)
          .in("id", newsIds)
          .eq("is_published", true)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ContentRow[], error: null }),
    lessonIds.length
      ? client
          .from("learning_cards")
          .select(CONTENT_COLUMNS)
          .in("id", lessonIds)
          .eq("is_published", true)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ContentRow[], error: null }),
  ]);

  if (newsRes.error) {
    console.error("Top 10: failed to load news:", newsRes.error.message);
  }
  if (lessonRes.error) {
    console.error("Top 10: failed to load lessons:", lessonRes.error.message);
  }

  const byKey = new Map<string, TopTenEntry>();

  for (const row of (newsRes.data || []) as ContentRow[]) {
    byKey.set(`news:${row.id}`, toEntry("news", row));
  }
  for (const row of (lessonRes.data || []) as ContentRow[]) {
    byKey.set(`learning_card:${row.id}`, toEntry("learning_card", row));
  }

  return refs
    .map((ref) => byKey.get(`${ref.type}:${ref.id}`))
    .filter((entry): entry is TopTenEntry => Boolean(entry));
}

function toEntry(type: TopTenType, row: ContentRow): TopTenEntry {
  return {
    type,
    id: row.id,
    title: row.title,
    category: row.category,
    imageUrl:
      resolveThumbnailUrl(
        row.thumbnail_url,
        row.cover_image_url,
        row.media_source
      ) || null,
    href: type === "news" ? `/news/${row.slug}` : `/learning/${row.slug}`,
  };
}

// The homepage list; empty if nothing is picked or the settings
// table isn't set up yet.
export async function getTopTen(): Promise<TopTenEntry[]> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("id", TOP_TEN_ID)
      .maybeSingle();

    if (error) {
      console.error("Top 10: failed to load list:", error.message);
      return [];
    }

    const refs = parseTopTen(data?.settings);
    return refs.length ? resolveTopTen(refs) : [];
  } catch (err) {
    console.error("Top 10: failed to load list:", err);
    return [];
  }
}
