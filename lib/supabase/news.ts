import { supabase } from "./client";

export async function getNewsItems() {
  const { data, error } = await supabase
    .from("news")
    .select(`
      id,
      slug,
      title,
      excerpt,
      cover_image_url,
      media_source,
      category,
      author,
      published_at,
      is_published
    `)
    .eq("is_published", true)
    .order("published_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      [
        "SUPABASE NEWS LIST ERROR",
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data || [];
}

export async function getNewsItem(slug: string) {
  const { data, error } = await supabase
    .from("news")
    .select(`
      id,
      slug,
      title,
      excerpt,
      cover_image_url,
      media_source,
      category,
      author,
      published_at,
      is_published,
      content_html
    `)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }

  if (error) {
    throw new Error(
      [
        "SUPABASE NEWS ERROR",
        `Slug: ${slug}`,
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data;
}

export async function getNewsBlocks(
  newsId: string
) {
  const { data, error } = await supabase
    .from("news_blocks")
    .select(`
      id,
      news_id,
      block_type,
      sort_order,
      content
    `)
    .eq("news_id", newsId)
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      [
        "SUPABASE NEWS BLOCKS ERROR",
        `News ID: ${newsId}`,
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data || [];
}