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
      card_type,
      gallery_eyebrow,
      gallery_how_to_use,
      gallery_template_url,
      gallery_template_label
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
 * gallery items an admin grouped onto this card, in the order
 * they chose. Each item is either linked to an existing Prompt
 * Library entry (uses that item's own title/prompt/media), or a
 * manual entry written just for this gallery (uses its own
 * custom_* columns instead) — both are normalized to the same
 * shape here so the page doesn't need to know which is which.
 */
export async function getLearningCardGalleryPrompts(
  learningCardId: string
) {
  const { data, error } = await supabase
    .from("learning_card_prompts")
    .select(
      `
      sort_order,
      library_item_id,
      item_category,
      extra_media_urls,
      custom_title,
      custom_prompt_text,
      custom_media_type,
      custom_media_url,
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

  type RawRow = {
    library_item_id: string | null;
    item_category: string | null;
    extra_media_urls: string[] | null;
    custom_title: string | null;
    custom_prompt_text: string | null;
    custom_media_type: string | null;
    custom_media_url: string | null;
    library_items: {
      id: string;
      slug: string;
      title: string;
      prompt: string | null;
      media_type: string | null;
      media_url: string | null;
      thumbnail_url: string | null;
    } | null;
  };

  return ((data || []) as unknown as RawRow[])
    .map((row) => {
      if (row.library_item_id && row.library_items) {
        return {
          key: row.library_items.id,
          slug: row.library_items.slug as string | null,
          title: row.library_items.title,
          promptText: row.library_items.prompt,
          mediaType: row.library_items.media_type,
          mediaUrl: row.library_items.media_url,
          thumbnailUrl: row.library_items.thumbnail_url,
          category: row.item_category,
          extraImages: row.extra_media_urls || [],
        };
      }

      if (row.custom_title) {
        return {
          key: row.custom_title + row.custom_media_url,
          slug: null,
          title: row.custom_title,
          promptText: row.custom_prompt_text,
          mediaType: row.custom_media_type,
          mediaUrl: row.custom_media_url,
          thumbnailUrl: null,
          category: row.item_category,
          extraImages: row.extra_media_urls || [],
        };
      }

      return null;
    })
    .filter(Boolean) as {
    key: string;
    slug: string | null;
    title: string;
    promptText: string | null;
    mediaType: string | null;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    category: string | null;
    extraImages: string[];
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
