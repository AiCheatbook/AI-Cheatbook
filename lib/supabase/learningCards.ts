import { supabase } from "./client";

export async function getLearningCardItems() {
  const { data, error } = await supabase
    .from("learning_cards")
    .select(`
      id,
      slug,
      title,
      summary,
      cover_image_url,
      media_source,
      thumbnail_url,
      category,
      tags,
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
        "SUPABASE LEARNING CARDS LIST ERROR",
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data || [];
}

export async function getLearningCardItem(
  slug: string
) {
  const { data, error } = await supabase
    .from("learning_cards")
    .select(`
      id,
      slug,
      title,
      summary,
      cover_image_url,
      media_source,
      thumbnail_url,
      category,
      tags,
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
        "SUPABASE LEARNING CARD ERROR",
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

export async function getLearningCardBlocks(
  learningCardId: string
) {
  const { data, error } = await supabase
    .from("learning_card_blocks")
    .select(`
      id,
      learning_card_id,
      block_type,
      sort_order,
      content
    `)
    .eq(
      "learning_card_id",
      learningCardId
    )
    .order("sort_order", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      [
        "SUPABASE LEARNING CARD BLOCKS ERROR",
        `Learning Card ID: ${learningCardId}`,
        `Code: ${error.code || "unknown"}`,
        `Message: ${error.message || "unknown"}`,
        `Details: ${error.details || "none"}`,
        `Hint: ${error.hint || "none"}`,
      ].join("\n")
    );
  }

  return data || [];
}
