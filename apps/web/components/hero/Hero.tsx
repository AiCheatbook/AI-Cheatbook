import HeroTitle from "./HeroTitle";
import HeroSearch from "./HeroSearch";
import HeroButtons from "./HeroButtons";
import TrendingTags from "./TrendingTags";

export default function Hero() {
  return (
    <section className="border-b border-zinc-900 bg-black px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto flex max-w-6xl flex-col items-center text-center">

        {/* Hero Title */}

        <HeroTitle />

        {/* Search */}

        <div className="mt-10 w-full max-w-3xl">
          <HeroSearch />
        </div>

        {/* Buttons */}

        <HeroButtons />

        {/* Trending Tags */}

        <div className="mt-8">
          <TrendingTags />
        </div>

      </div>
    </section>
  );
}