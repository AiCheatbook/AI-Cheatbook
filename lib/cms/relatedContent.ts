export type RelatedContentType =
  | "news"
  | "prompt"
  | "learning_card";

export type RelatedContentItem = {
  type: RelatedContentType;
  id: string;
  slug: string;
  title: string;
};

export const RELATED_CONTENT_PATH_PREFIX: Record<
  RelatedContentType,
  string
> = {
  news: "/news",
  prompt: "/prompt",
  learning_card: "/learning",
};

export const RELATED_CONTENT_LABEL: Record<
  RelatedContentType,
  string
> = {
  news: "News",
  prompt: "Prompt",
  learning_card: "Learning Card",
};

export function relatedContentHref(
  item: RelatedContentItem
): string {
  return `${RELATED_CONTENT_PATH_PREFIX[item.type]}/${item.slug}`;
}
