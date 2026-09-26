"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getUnifiedFeed } from "@/lib/feed/getUnifiedFeed";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";
import type { FeedItem } from "@/lib/feed/types";
import HeroBanner, { type HeroItem } from "@/components/home/ott/HeroBanner";
import ContentRow, { type RowItem } from "@/components/home/ott/ContentRow";
import FirstVisitIntro from "@/components/home/FirstVisitIntro";

type LibraryRow = {
  id: string;
  title: string;
  slug: string;
  ai_tools: string[] | null;
  thumbnail_url: string | null;
  media_url: string | null;
  media_source: string | null;
  is_trending: boolean | null;
};

type Rows = {
  prompts: RowItem[];
  trendingPrompts: RowItem[];
  news: RowItem[];
  learning: RowItem[];
  community: RowItem[];
};

const EMPTY_ROWS: Rows = {
  prompts: [],
  trendingPrompts: [],
  news: [],
  learning: [],
  community: [],
};

function feedToRow(item: FeedItem, badge?: string): RowItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.category || item.authorName,
    imageUrl: item.imageUrl,
    href: item.href,
    badge: badge || null,
  };
}

async function loadLibrary(): Promise<LibraryRow[]> {
  const { data, error } = await supabase
    .from("library_items")
    .select(
      "id, title, slug, ai_tools, thumbnail_url, media_url, media_source, is_trending"
    )
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("Home: failed to load prompts:", error.message);
    return [];
  }

  return (data || []) as LibraryRow[];
}

/*
 * Netflix-style homepage: a featured banner followed by
 * sideways-scrolling rows of prompts, news, learning cards and
 * community posts. The community feed itself lives at /community.
 */
export default function HomePage() {
  const [hero, setHero] = useState<HeroItem | null>(null);
  const [rows, setRows] = useState<Rows>(EMPTY_ROWS);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    async function load() {
      const [library, news, learning, discussions, promptPosts] =
        await Promise.all([
          loadLibrary(),
          getUnifiedFeed({ type: "news", page: 1 }),
          getUnifiedFeed({ type: "learning_card", page: 1 }),
          getUnifiedFeed({ type: "discussion", page: 1 }),
          getUnifiedFeed({ type: "prompt", page: 1 }),
        ]);

      const promptItems: RowItem[] = library.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.ai_tools?.join(" · ") || null,
        imageUrl:
          resolveThumbnailUrl(
            p.thumbnail_url,
            p.media_url,
            p.media_source
          ) || null,
        href: `/prompts/${p.slug}`,
        badge: p.is_trending ? "Trending" : null,
      }));

      const community = [...discussions.items, ...promptPosts.items]
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        )
        .map((item) => ({
          ...feedToRow(item, item.type === "prompt" ? "Prompt" : undefined),
          subtitle: item.authorName,
        }));

      // Feature the newest news story or learning card that has
      // an image; fall back to the newest item of either kind.
      const heroSource =
        news.items.find((i) => i.imageUrl) ||
        learning.items.find((i) => i.imageUrl) ||
        news.items[0] ||
        learning.items[0] ||
        null;

      setHero(
        heroSource
          ? {
              title: heroSource.title,
              excerpt: heroSource.excerpt,
              imageUrl: heroSource.imageUrl,
              href: heroSource.href,
              label:
                heroSource.type === "news"
                  ? "Featured AI News"
                  : "Featured Lesson",
            }
          : null
      );

      setRows({
        trendingPrompts: promptItems.filter((p) => p.badge),
        prompts: promptItems.map((p) => ({ ...p, badge: null })),
        news: news.items.map((i) => feedToRow(i)),
        learning: learning.items.map((i) => feedToRow(i)),
        community,
      });

      setLoading(false);

      try {
        if (!sessionStorage.getItem("introSeen")) {
          setShowIntro(true);
        }
      } catch {
        // Storage unavailable — skip the intro.
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#141414] pb-16 text-white">
      {showIntro && (
        <FirstVisitIntro onDismiss={() => setShowIntro(false)} />
      )}

      <HeroBanner item={hero} loading={loading} />

      <div className="relative -mt-10 space-y-8 sm:space-y-10">
        <ContentRow
          title="Trending Prompts"
          seeAllHref="/prompts"
          items={rows.trendingPrompts}
          loading={loading}
          variant="poster"
        />

        <ContentRow
          title="New in the Prompt Book"
          seeAllHref="/prompts"
          items={rows.prompts}
          loading={loading}
          variant="poster"
        />

        <ContentRow
          title="Latest AI News"
          seeAllHref="/news"
          items={rows.news}
          loading={loading}
        />

        <ContentRow
          title="Learn AI"
          seeAllHref="/learning"
          items={rows.learning}
          loading={loading}
          variant="poster"
        />

        <ContentRow
          title="From the Community"
          seeAllHref="/community"
          items={rows.community}
          loading={loading}
        />
      </div>
    </main>
  );
}
