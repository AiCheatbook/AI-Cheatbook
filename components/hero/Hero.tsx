import HeroSearch from "./HeroSearch";
import HeroButtons from "./HeroButtons";

export default function Hero() {
  return (
    <section className="border-b border-zinc-900 bg-black px-6 py-10 sm:py-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">

        {/* Global Search */}

        <div className="w-full">
          <HeroSearch />
        </div>

        {/* Buttons */}

        <HeroButtons />

      </div>
    </section>
  );
}