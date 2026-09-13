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
      is_published,
      card_type
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
      image_alt_text,
      thumbnail_url,
      category,
      tags,
      author,
      published_at,
      is_published,
      content_html,
      related_content,
      card_type
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

/*
 * Only relevant when card_type === 'prompt_gallery' — the set of
 * prompts an admin grouped together onto this one card, in the
 * order they chose, each with just enough of its own data (title,
 * thumbnail, the actual prompt text) to render a gallery grid.
 */
export async function getLearningCardGalleryPrompts(
  learningCardId: string
) {
  const { data, error } = await supabase
    .from("learning_card_prompts")
    .select(
      `
      sort_order,
      library_items (
        id,
        slug,
        title,
        prompt,
        media_type,
        media_url,
        thumbnail_url
      )
    `
    )
    .eq("learning_card_id", learningCardId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      [
        "SUPABASE LEARNING CARD GALLERY PROMPTS ERROR",
        `Learning Card ID: ${learningCardId}`,
        `Message: ${error.message || "unknown"}`,
      ].join("\n")
    );
  }

  return (data || [])
    .map((row) => row.library_items)
    .filter(Boolean) as unknown as {
    id: string;
    slug: string;
    title: string;
    prompt: string | null;
    media_type: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
  }[];
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
