import { supabase } from "./client";
import {
  isMissingColumnError,
  parseGallerySettings,
  parseItemDetails,
  type StyleItem,
} from "@/lib/cms/styleLibrary";
import type { RelatedContentItem } from "@/lib/cms/relatedContent";

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

const LEARNING_CARD_DETAIL_COLUMNS = `
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
    `;

export async function getLearningCardItem(
  slug: string
) {
  const query = (columns: string) =>
    supabase
      .from("learning_cards")
      .select(columns)
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

  let { data, error } = await query(
    `${LEARNING_CARD_DETAIL_COLUMNS}, gallery_settings`
  );

  // Before database/060_prompt_style_pages.sql is run the
  // gallery_settings column doesn't exist yet.
  if (isMissingColumnError(error)) {
    ({ data, error } = await query(LEARNING_CARD_DETAIL_COLUMNS));
  }

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

  const card = data as unknown as Record<string, unknown> & {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    cover_image_url: string | null;
    media_source: string | null;
    image_alt_text: string | null;
    thumbnail_url: string | null;
    category: string | null;
    tags: string[] | null;
    author: string | null;
    published_at: string | null;
    content_html: string | null;
    related_content: RelatedContentItem[] | null;
    card_type: string | null;
    gallery_eyebrow: string | null;
    gallery_how_to_use: string | null;
    gallery_template_url: string | null;
    gallery_template_label: string | null;
    gallery_settings?: unknown;
  };

  return {
    ...card,
    gallerySettings: parseGallerySettings(card.gallery_settings),
  };
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
const GALLERY_PROMPT_COLUMNS = `
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
    `;

export async function getLearningCardGalleryPrompts(
  learningCardId: string
): Promise<StyleItem[]> {
  const query = (columns: string) =>
    supabase
      .from("learning_card_prompts")
      .select(columns)
      .eq("learning_card_id", learningCardId)
      .order("sort_order", { ascending: true });

  let { data, error } = await query(
    `${GALLERY_PROMPT_COLUMNS}, item_details`
  );

  if (isMissingColumnError(error)) {
    ({ data, error } = await query(GALLERY_PROMPT_COLUMNS));
  }

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
    item_details?: unknown;
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
    .map((row, index): StyleItem | null => {
      const details = parseItemDetails(row.item_details);

      if (row.library_item_id && row.library_items) {
        return {
          key: `${row.library_items.id}-${index}`,
          slug: row.library_items.slug,
          title: row.library_items.title,
          promptText: row.library_items.prompt,
          mediaType: row.library_items.media_type,
          mediaUrl: row.library_items.media_url,
          thumbnailUrl: row.library_items.thumbnail_url,
          category: row.item_category,
          extraImages: row.extra_media_urls || [],
          ...details,
        };
      }

      if (row.custom_title) {
        return {
          key: `custom-${index}`,
          slug: null,
          title: row.custom_title,
          promptText: row.custom_prompt_text,
          mediaType: row.custom_media_type,
          mediaUrl: row.custom_media_url,
          thumbnailUrl: null,
          category: row.item_category,
          extraImages: row.extra_media_urls || [],
          ...details,
        };
      }

      return null;
    })
    .filter((item): item is StyleItem => item !== null);
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
