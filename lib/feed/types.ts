export type FeedItemType =
  | "news"
  | "learning_card"
  | "question"
  | "discussion"
  | "discovery"
  | "prompt"
  | "resource"
  | "poll"
  | "learning";

export type FeedItem = {
  id: string;
  type: FeedItemType;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  category: string | null;
  imageUrl: string | null;
  publishedAt: string;
  href: string;
  voteCount: number;
  replyCount: number;
  isAnswered: boolean;
};

export const FEED_PAGE_SIZE = 20;
