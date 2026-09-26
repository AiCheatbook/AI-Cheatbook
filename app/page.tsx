"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Newspaper, Users } from "lucide-react";
import { getUnifiedFeed } from "@/lib/feed/getUnifiedFeed";
import type { FeedItem } from "@/lib/feed/types";
import HeroBanner, { type HeroItem } from "@/components/home/ott/HeroBanner";
import ContentRow, { type RowItem } from "@/components/home/ott/ContentRow";
import FirstVisitIntro from "@/components/home/FirstVisitIntro";

type CategoryRow = {
  category: string;
  items: RowItem[];
};

type HomeData = {
  hero: HeroItem[];
  lessons: RowItem[];
  lessonCategories: CategoryRow[];
  community: RowItem[];
  news: RowItem[];
};

const EMPTY_DATA: HomeData = {
  hero: [],
  lessons: [],
  lessonCategories: [],
  community: [],
  news: [],
};

const HERO_SLIDES = 5;
const MAX_CATEGORY_ROWS = 4;
const MIN_ITEMS_PER_CATEGORY_ROW = 3;

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

// Learning rows by category, most-populated categories first.
function groupByCategory(items: FeedItem[]): CategoryRow[] {
  const groups = new Map<string, FeedItem[]>();

  for (const item of items) {
    if (!item.category) continue;
    const list = groups.get(item.category) || [];
    list.push(item);
    groups.set(item.category, list);
  }

  return Array.from(groups.entries())
    .filter(([, list]) => list.length >= MIN_ITEMS_PER_CATEGORY_ROW)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_CATEGORY_ROWS)
    .map(([category, list]) => ({
      category,
      items: list.map((item) => feedToRow(item)),
    }));
}

/*
 * Streaming-app style homepage in the site's light theme. AI
 * Learning is the primary content (rotating banner, then lesson
 * rows); community posts follow and AI News sits last as a
 * secondary row. The full community feed lives at /community.
 */
export default function HomePage() {
  const [data, setData] = useState<HomeData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    async function load() {
      const [learningPage1, learningPage2, news, discussions, promptPosts] =
        await Promise.all([
          getUnifiedFeed({ type: "learning_card", page: 1 }),
          getUnifiedFeed({ type: "learning_card", page: 2 }),
          getUnifiedFeed({ type: "news", page: 1 }),
          getUnifiedFeed({ type: "discussion", page: 1 }),
          getUnifiedFeed({ type: "prompt", page: 1 }),
        ]);

      const learning = [
        ...learningPage1.items,
        ...(learningPage1.hasMore ? learningPage2.items : []),
      ];

      // Prefer lessons with an image for the banner.
      const heroSource = [
        ...learning.filter((i) => i.imageUrl),
        ...learning.filter((i) => !i.imageUrl),
      ].slice(0, HERO_SLIDES);

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

      setData({
        hero: heroSource.map((item) => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
          imageUrl: item.imageUrl,
          href: item.href,
          label: item.category || "AI Learning",
        })),
        lessons: learning.map((item) => feedToRow(item)),
        lessonCategories: groupByCategory(learning),
        community,
        news: news.items.map((item) => feedToRow(item)),
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

  const learningIcon = (
    <GraduationCap className="h-5 w-5 text-brand-text" strokeWidth={2} />
  );

  return (
    <main className="min-h-screen bg-white pb-16 text-zinc-900">
      {showIntro && (
        <FirstVisitIntro onDismiss={() => setShowIntro(false)} />
      )}

      <HeroBanner items={data.hero} loading={loading} />

      <div className="mt-8 space-y-8 sm:space-y-10">
        <ContentRow
          title="Latest AI Lessons"
          seeAllHref="/learning"
          items={data.lessons}
          loading={loading}
          variant="feature"
          icon={learningIcon}
        />

        {data.lessonCategories.map((row) => (
          <ContentRow
            key={row.category}
            title={row.category}
            seeAllHref="/learning"
            items={row.items}
            loading={false}
            variant="poster"
            icon={learningIcon}
          />
        ))}

        <ContentRow
          title="From the Community"
          seeAllHref="/community"
          items={data.community}
          loading={loading}
          icon={<Users className="h-5 w-5 text-brand-text" strokeWidth={2} />}
        />

        <ContentRow
          title="AI News"
          seeAllHref="/news"
          items={data.news}
          loading={loading}
          icon={<Newspaper className="h-5 w-5 text-zinc-500" strokeWidth={2} />}
        />
      </div>
    </main>
  );
}
