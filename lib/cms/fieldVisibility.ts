/*
 * Lets a moderator dim any optional field/section on the Prompt
 * form when they don't need it for a particular prompt — purely
 * a visual "get it out of my way while I fill this in" switch.
 * Dimming a field never clears its saved value; it only greys it
 * out and disables its inputs so it can't be edited by accident.
 * The list of dimmed keys is saved per-prompt (disabled_fields on
 * library_items) so it's remembered next time that prompt is
 * reopened for editing. Title and Slug are left out on purpose —
 * both are required to save the prompt at all.
 */

export type ToggleableFieldKey =
  | "type"
  | "category"
  | "description"
  | "descriptionHtml"
  | "relatedContent"
  | "promptText"
  | "media"
  | "thumbnail"
  | "authorName"
  | "aiTools"
  | "taxonomyKeywords"
  | "visibility"
  | "seo";

export const TOGGLEABLE_FIELDS: {
  key: ToggleableFieldKey;
  label: string;
}[] = [
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "descriptionHtml", label: "Full Details" },
  { key: "relatedContent", label: "Related Content" },
  { key: "promptText", label: "Prompt Content" },
  { key: "media", label: "Preview Media" },
  { key: "thumbnail", label: "Thumbnail" },
  { key: "authorName", label: "Author Name" },
  { key: "aiTools", label: "AI Tools" },
  { key: "taxonomyKeywords", label: "Taxonomy & Keywords" },
  { key: "visibility", label: "Featured / Trending" },
  { key: "seo", label: "SEO" },
];

export function isFieldDisabled(
  disabledFields: string[],
  key: ToggleableFieldKey
): boolean {
  return disabledFields.includes(key);
}

export function toggleField(
  disabledFields: string[],
  key: ToggleableFieldKey
): string[] {
  return disabledFields.includes(key)
    ? disabledFields.filter((k) => k !== key)
    : [...disabledFields, key];
}
