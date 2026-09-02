import NewsSection from "@/components/news/NewsSection";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "AI News | AI Cheatbook",
  description:
    "Latest AI tools, models, features and updates for creators and developers.",
  path: "/news",
});

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <NewsSection headingLevel="h1" />
    </main>
  );
}
