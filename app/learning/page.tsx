import LearningCardsGrid from "@/components/learning-cards/LearningCardsGrid";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Learning Cards | AI Cheatbook",
  description:
    "Clear, structured explanations of AI concepts, tools, and techniques.",
  path: "/learning",
});

export default function LearningCardsPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <LearningCardsGrid />
    </main>
  );
}
