import LearningCardsSection from "@/components/learning-cards/LearningCardsSection";
import NewsSection from "@/components/news/NewsSection";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-white">

        {/* Learning Cards */}

        <LearningCardsSection />

        {/* Latest AI News */}

        <NewsSection />

      </main>

      {/* Footer */}

      <Footer />
    </>
  );
}