import Hero from "@/components/hero/Hero";
import TrendingPrompts from "@/components/prompt/TrendingPrompts";
import CategorySection from "@/components/categories/CategorySection";
import NewsSection from "@/components/news/NewsSection";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-black">

        {/* Hero */}

        <Hero />

        {/* Trending Prompts */}

        <TrendingPrompts />

        {/* Categories */}

        <CategorySection />

        {/* Latest AI News */}

        <NewsSection />

      </main>

      {/* Footer */}

      <Footer />
    </>
  );
}