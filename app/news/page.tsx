import NewsSection from "@/components/news/NewsSection";

export const metadata = {
  title: "AI News | AI Cheatbook",
  description:
    "Latest AI tools, models, features and updates for creators and developers.",
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <NewsSection />
    </main>
  );
}