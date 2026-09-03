import NewsSection from "@/components/news/NewsSection";
import SiteSidebarShell from "@/components/community/layout/SiteSidebarShell";
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
      <SiteSidebarShell>
        <NewsSection headingLevel="h1" />
      </SiteSidebarShell>
    </main>
  );
}
