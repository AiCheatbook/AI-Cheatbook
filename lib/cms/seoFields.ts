/*
 * Shared SEO/metadata fields.
 *
 * Every content type (News, Prompt Library,
 * Learning Cards) uses this exact same shape,
 * matching the columns added in
 * database/001_cms_seo_and_learning_cards.sql
 */

export type SeoFields = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  imageAltText: string;
  isIndexed: boolean;
};

export function emptySeoFields(): SeoFields {
  return {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    imageAltText: "",
    isIndexed: true,
  };
}

/*
 * Converts the SEO fields into the flat
 * column shape stored in Supabase
 * (news / library_items / learning_cards).
 */

export function seoFieldsToRow(
  seo: SeoFields
) {
  return {
    meta_title: seo.metaTitle || null,
    meta_description:
      seo.metaDescription || null,
    meta_keywords: seo.metaKeywords || null,
    canonical_url: seo.canonicalUrl || null,
    og_title: seo.ogTitle || null,
    og_description:
      seo.ogDescription || null,
    og_image_url: seo.ogImageUrl || null,
    image_alt_text:
      seo.imageAltText || null,
    is_indexed: seo.isIndexed,
  };
}

/*
 * Converts a Supabase row back into the
 * SEO fields shape used by the form.
 */

export function rowToSeoFields(
  row: Record<string, unknown>
): SeoFields {
  return {
    metaTitle:
      (row.meta_title as string) || "",
    metaDescription:
      (row.meta_description as string) ||
      "",
    metaKeywords:
      (row.meta_keywords as string) || "",
    canonicalUrl:
      (row.canonical_url as string) || "",
    ogTitle: (row.og_title as string) || "",
    ogDescription:
      (row.og_description as string) || "",
    ogImageUrl:
      (row.og_image_url as string) || "",
    imageAltText:
      (row.image_alt_text as string) || "",
    isIndexed:
      row.is_indexed === undefined ||
      row.is_indexed === null
        ? true
        : Boolean(row.is_indexed),
  };
}
