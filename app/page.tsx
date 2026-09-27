import { GraduationCap, Trophy } from "lucide-react";
import { getUnifiedFeed } from "@/lib/feed/getUnifiedFeed";
import type { FeedItem } from "@/lib/feed/types";
import HeroBanner, { type HeroItem } from "@/components/home/ott/HeroBanner";
import ContentRow, { type RowItem } from "@/components/home/ott/ContentRow";
import HomeIntro from "@/components/home/HomeIntro";
import Reveal from "@/components/home/ott/Reveal";
import TopicMarquee from "@/components/home/ott/TopicMarquee";
import CommunityCta from "@/components/home/ott/CommunityCta";
import NewsList from "@/components/home/ott/NewsList";

type CategoryRow = {
  category: string;
  items: RowItem[];
};

type HomeData = {
  hero: HeroItem[];
  topics: string[];
  lessons: RowItem[];
  lessonCategories: CategoryRow[];
  news: RowItem[];
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

// Rebuild the homepage on the server at most every 5 minutes, so
// visitors get ready-made HTML instead of waiting for the browser
// to fetch lessons.
export const revalidate = 300;

async function loadHomeData(): Promise<HomeData> {
  const [learningPage1, learningPage2, news] = await Promise.all([
    getUnifiedFeed({ type: "learning_card", page: 1 }),
    getUnifiedFeed({ type: "learning_card", page: 2 }),
    getUnifiedFeed({ type: "news", page: 1 }),
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

  return {
    hero: heroSource.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      imageUrl: item.imageUrl,
      href: item.href,
      label: item.category || "AI Learning",
    })),
    topics: Array.from(
      new Set(
        learning
          .map((item) => item.category)
          .filter((c): c is string => Boolean(c))
      )
    ),
    lessons: learning.map((item) => feedToRow(item)),
    lessonCategories: groupByCategory(learning),
    news: news.items.map((item) => feedToRow(item)),
  };
}

/*
 * Streaming-app style homepage in the site's light theme. AI
 * Learning is the primary content (rotating banner, then lesson
 * rows), then a community call-to-action, with AI News last as
 * a secondary block. The community feed lives at /community.
 */
export default async function HomePage() {
  const data = await loadHomeData();

  const learningIcon = (
    <GraduationCap className="h-5 w-5 text-brand-text" strokeWidth={2} />
  );

  return (
    <main className="min-h-screen bg-white pb-16 text-zinc-900">
      <HomeIntro />

      <HeroBanner items={data.hero} loading={false} />

      <TopicMarquee topics={data.topics} />

      <div className="mt-10 space-y-12 sm:space-y-14">
        <ContentRow
          title="Latest AI Lessons"
          subtitle="New visual lessons, fresh every week"
          seeAllHref="/learning"
          items={data.lessons}
          loading={false}
          variant="feature"
          icon={learningIcon}
        />

        {data.lessons.length >= 3 && (
          <Reveal>
            <ContentRow
              title="Top 10 to Start With"
              subtitle="The best first steps into AI"
              seeAllHref="/learning"
              items={data.lessons}
              loading={false}
              variant="top10"
              icon={<Trophy className="h-5 w-5 text-amber-500" strokeWidth={2} />}
            />
          </Reveal>
        )}

        {data.lessonCategories.map((row) => (
          <Reveal key={row.category}>
            <ContentRow
              title={row.category}
              seeAllHref="/learning"
              items={row.items}
              loading={false}
              variant="poster"
              icon={learningIcon}
            />
          </Reveal>
        ))}

        <Reveal>
          <CommunityCta />
        </Reveal>

        <Reveal>
          <NewsList items={data.news} loading={false} />
        </Reveal>
      </div>
    </main>
  );
}
