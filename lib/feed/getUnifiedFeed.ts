import { supabase } from "@/lib/supabase/client";
import {
  FeedItem,
  FeedItemType,
  FEED_PAGE_SIZE,
} from "./types";

/*
 * The unified feed query layer.
 *
 * Deliberately does NOT physically merge
 * News/Learning/Community into one database
 * table — that would be a large, risky
 * migration for content that already has
 * working, CMS-rich structure. Instead, this
 * fetches from each specialized table in
 * parallel and normalizes the results into
 * one common shape, the same way the existing
 * Community feed already merges threads and
 * polls — just widened to include News and
 * Learning.
 *
 * Pagination approach: for the "all" tab,
 * each source is capped at a bounded recent
 * window (not thousands of rows), merged and
 * sorted in memory, then sliced into pages.
 * For a single-type tab, real database-level
 * pagination is used against that one table,
 * which is simpler and more efficient.
 */

const SOURCE_FETCH_CAP = 60;

type FetchFeedParams = {
  type?: FeedItemType | "all";
  page?: number;
};

type FetchFeedResult = {
  items: FeedItem[];
  hasMore: boolean;
};

export async function getUnifiedFeed({
  type = "all",
  page = 1,
}: FetchFeedParams): Promise<FetchFeedResult> {
  if (type === "news") {
    return fetchNewsPage(page);
  }

  if (type === "learning_card") {
    return fetchLearningPage(page);
  }

  if (type === "poll") {
    return fetchPollsPage(page);
  }

  if (
    type === "question" ||
    type === "discussion" ||
    type === "discovery" ||
    type === "prompt" ||
    type === "resource"
  ) {
    return fetchThreadsPage(page, type);
  }

  return fetchAllMerged(page);
}

async function fetchAllMerged(
  page: number
): Promise<FetchFeedResult> {
  const [
    newsItems,
    learningItems,
    threadItems,
    pollItems,
  ] = await Promise.all([
    fetchNews(SOURCE_FETCH_CAP),
    fetchLearning(SOURCE_FETCH_CAP),
    fetchThreads(SOURCE_FETCH_CAP),
    fetchPolls(SOURCE_FETCH_CAP),
  ]);

  const merged = [
    ...newsItems,
    ...learningItems,
    ...threadItems,
    ...pollItems,
  ].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() -
      new Date(a.publishedAt).getTime()
  );

  const start = (page - 1) * FEED_PAGE_SIZE;
  const end = start + FEED_PAGE_SIZE;

  return {
    items: merged.slice(start, end),
    hasMore: merged.length > end,
  };
}

async function fetchNews(
  limit: number
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select(
      "id, title, excerpt, category, author, cover_image_url, slug, published_at"
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      "Failed to load news for feed:",
      error.message
    );
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    type: "news" as const,
    title: item.title,
    excerpt: item.excerpt,
    authorName: item.author,
    category: item.category,
    imageUrl: item.cover_image_url,
    publishedAt: item.published_at,
    href: `/news/${item.slug}`,
    voteCount: 0,
    replyCount: 0,
    isAnswered: false,
  }));
}

async function fetchNewsPage(
  page: number
): Promise<FetchFeedResult> {
  const start = (page - 1) * FEED_PAGE_SIZE;
  const end = start + FEED_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("news")
    .select(
      "id, title, excerpt, category, author, cover_image_url, slug, published_at",
      { count: "exact" }
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", {
      ascending: false,
    })
    .range(start, end);

  if (error) {
    console.error(
      "Failed to load news page:",
      error.message
    );
    return { items: [], hasMore: false };
  }

  const items: FeedItem[] = (
    data || []
  ).map((item) => ({
    id: item.id,
    type: "news" as const,
    title: item.title,
    excerpt: item.excerpt,
    authorName: item.author,
    category: item.category,
    imageUrl: item.cover_image_url,
    publishedAt: item.published_at,
    href: `/news/${item.slug}`,
    voteCount: 0,
    replyCount: 0,
    isAnswered: false,
  }));

  return {
    items,
    hasMore: (count || 0) > end + 1,
  };
}

async function fetchLearning(
  limit: number
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("learning_cards")
    .select(
      "id, title, summary, category, author, cover_image_url, slug, published_at"
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error(
      "Failed to load learning cards for feed:",
      error.message
    );
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    type: "learning_card" as const,
    title: item.title,
    excerpt: item.summary,
    authorName: item.author,
    category: item.category,
    imageUrl: item.cover_image_url,
    publishedAt: item.published_at,
    href: `/learning/${item.slug}`,
    voteCount: 0,
    replyCount: 0,
    isAnswered: false,
  }));
}

async function fetchLearningPage(
  page: number
): Promise<FetchFeedResult> {
  const start = (page - 1) * FEED_PAGE_SIZE;
  const end = start + FEED_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("learning_cards")
    .select(
      "id, title, summary, category, author, cover_image_url, slug, published_at",
      { count: "exact" }
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", {
      ascending: false,
    })
    .range(start, end);

  if (error) {
    console.error(
      "Failed to load learning page:",
      error.message
    );
    return { items: [], hasMore: false };
  }

  const items: FeedItem[] = (
    data || []
  ).map((item) => ({
    id: item.id,
    type: "learning_card" as const,
    title: item.title,
    excerpt: item.summary,
    authorName: item.author,
    category: item.category,
    imageUrl: item.cover_image_url,
    publishedAt: item.published_at,
    href: `/learning/${item.slug}`,
    voteCount: 0,
    replyCount: 0,
    isAnswered: false,
  }));

  return {
    items,
    hasMore: (count || 0) > end + 1,
  };
}

async function fetchPolls(
  limit: number
): Promise<FeedItem[]> {
  const [
    { data: polls, error },
    { data: voteRows },
  ] = await Promise.all([
    supabase
      .from("community_polls")
      .select(
        "id, question, category, created_at, profiles ( display_name, email )"
      )
      .eq("is_hidden", false)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
    supabase
      .from("community_poll_votes")
      .select("poll_id"),
  ]);

  if (error) {
    console.error(
      "Failed to load polls for feed:",
      error.message
    );
    return [];
  }

  const voteCounts: Record<string, number> =
    {};

  for (const row of voteRows || []) {
    voteCounts[row.poll_id] =
      (voteCounts[row.poll_id] || 0) + 1;
  }

  return (
    (polls || []) as unknown as Array<{
      id: string;
      question: string;
      category: string;
      created_at: string;
      profiles: {
        display_name: string | null;
        email: string | null;
      } | null;
    }>
  ).map((poll) => ({
    id: poll.id,
    type: "poll" as const,
    title: poll.question,
    excerpt: null,
    authorName:
      poll.profiles?.display_name ||
      poll.profiles?.email ||
      "Community Member",
    category: poll.category,
    imageUrl: null,
    publishedAt: poll.created_at,
    href: `/community/polls/${poll.id}`,
    voteCount: voteCounts[poll.id] || 0,
    replyCount: 0,
    isAnswered: false,
  }));
}

async function fetchPollsPage(
  page: number
): Promise<FetchFeedResult> {
  const start = (page - 1) * FEED_PAGE_SIZE;
  const end = start + FEED_PAGE_SIZE - 1;

  const [
    { data: polls, error, count },
    { data: voteRows },
  ] = await Promise.all([
    supabase
      .from("community_polls")
      .select(
        "id, question, category, created_at, profiles ( display_name, email )",
        { count: "exact" }
      )
      .eq("is_hidden", false)
      .order("created_at", {
        ascending: false,
      })
      .range(start, end),
    supabase
      .from("community_poll_votes")
      .select("poll_id"),
  ]);

  if (error) {
    console.error(
      "Failed to load polls page:",
      error.message
    );
    return { items: [], hasMore: false };
  }

  const voteCounts: Record<string, number> =
    {};

  for (const row of voteRows || []) {
    voteCounts[row.poll_id] =
      (voteCounts[row.poll_id] || 0) + 1;
  }

  const items: FeedItem[] = (
    (polls || []) as unknown as Array<{
      id: string;
      question: string;
      category: string;
      created_at: string;
      profiles: {
        display_name: string | null;
        email: string | null;
      } | null;
    }>
  ).map((poll) => ({
    id: poll.id,
    type: "poll" as const,
    title: poll.question,
    excerpt: null,
    authorName:
      poll.profiles?.display_name ||
      poll.profiles?.email ||
      "Community Member",
    category: poll.category,
    imageUrl: null,
    publishedAt: poll.created_at,
    href: `/community/polls/${poll.id}`,
    voteCount: voteCounts[poll.id] || 0,
    replyCount: 0,
    isAnswered: false,
  }));

  return {
    items,
    hasMore: (count || 0) > end + 1,
  };
}

async function fetchThreads(
  limit: number,
  onlyKind?: string
): Promise<FeedItem[]> {
  let query = supabase
    .from("community_threads")
    .select(
      "id, title, body, category, content_kind, accepted_reply_id, created_at, profiles ( display_name, email )"
    )
    .eq("is_hidden", false)
    .is("deleted_at", null);

  if (onlyKind) {
    query = query.eq(
      "content_kind",
      onlyKind
    );
  }

  const [
    { data: threads, error },
    { data: voteRows },
    { data: replyRows },
  ] = await Promise.all([
    query
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
    supabase
      .from("community_thread_votes")
      .select("thread_id"),
    supabase
      .from("community_replies")
      .select("thread_id"),
  ]);

  if (error) {
    console.error(
      "Failed to load threads for feed:",
      error.message
    );
    return [];
  }

  const voteCounts: Record<string, number> =
    {};
  const replyCounts: Record<string, number> =
    {};

  for (const row of voteRows || []) {
    voteCounts[row.thread_id] =
      (voteCounts[row.thread_id] || 0) + 1;
  }

  for (const row of replyRows || []) {
    replyCounts[row.thread_id] =
      (replyCounts[row.thread_id] || 0) + 1;
  }

  return (
    (threads || []) as unknown as Array<{
      id: string;
      title: string;
      body: string;
      category: string;
      content_kind: FeedItemType;
      accepted_reply_id: string | null;
      created_at: string;
      profiles: {
        display_name: string | null;
        email: string | null;
      } | null;
    }>
  ).map((thread) => ({
    id: thread.id,
    type: thread.content_kind,
    title: thread.title,
    excerpt: thread.body,
    authorName:
      thread.profiles?.display_name ||
      thread.profiles?.email ||
      "Community Member",
    category: thread.category,
    imageUrl: null,
    publishedAt: thread.created_at,
    href: `/discussions/${thread.id}`,
    voteCount: voteCounts[thread.id] || 0,
    replyCount: replyCounts[thread.id] || 0,
    isAnswered: Boolean(
      thread.accepted_reply_id
    ),
  }));
}

async function fetchThreadsPage(
  page: number,
  onlyKind: string
): Promise<FetchFeedResult> {
  const start = (page - 1) * FEED_PAGE_SIZE;
  const end = start + FEED_PAGE_SIZE - 1;

  const [
    { data: threads, error, count },
    { data: voteRows },
    { data: replyRows },
  ] = await Promise.all([
    supabase
      .from("community_threads")
      .select(
        "id, title, body, category, content_kind, accepted_reply_id, created_at, profiles ( display_name, email )",
        { count: "exact" }
      )
      .eq("is_hidden", false)
      .is("deleted_at", null)
      .eq("content_kind", onlyKind)
      .order("created_at", {
        ascending: false,
      })
      .range(start, end),
    supabase
      .from("community_thread_votes")
      .select("thread_id"),
    supabase
      .from("community_replies")
      .select("thread_id"),
  ]);

  if (error) {
    console.error(
      "Failed to load threads page:",
      error.message
    );
    return { items: [], hasMore: false };
  }

  const voteCounts: Record<string, number> =
    {};
  const replyCounts: Record<string, number> =
    {};

  for (const row of voteRows || []) {
    voteCounts[row.thread_id] =
      (voteCounts[row.thread_id] || 0) + 1;
  }

  for (const row of replyRows || []) {
    replyCounts[row.thread_id] =
      (replyCounts[row.thread_id] || 0) + 1;
  }

  const items: FeedItem[] = (
    (threads || []) as unknown as Array<{
      id: string;
      title: string;
      body: string;
      category: string;
      content_kind: FeedItemType;
      accepted_reply_id: string | null;
      created_at: string;
      profiles: {
        display_name: string | null;
        email: string | null;
      } | null;
    }>
  ).map((thread) => ({
    id: thread.id,
    type: thread.content_kind,
    title: thread.title,
    excerpt: thread.body,
    authorName:
      thread.profiles?.display_name ||
      thread.profiles?.email ||
      "Community Member",
    category: thread.category,
    imageUrl: null,
    publishedAt: thread.created_at,
    href: `/discussions/${thread.id}`,
    voteCount: voteCounts[thread.id] || 0,
    replyCount: replyCounts[thread.id] || 0,
    isAnswered: Boolean(
      thread.accepted_reply_id
    ),
  }));

  return {
    items,
    hasMore: (count || 0) > end + 1,
  };
}
