import Link from "next/link";

export default function HeroButtons() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

      {/* Browse Prompts */}

      <Link
        href="/search"
        className="rounded-xl bg-brand px-6 py-3 font-medium text-white transition duration-200 hover:bg-brand-dark"
      >
        Browse Prompts
      </Link>

      {/* Generate Prompt */}

      <Link
        href="/generator"
        className="rounded-xl border border-zinc-700 bg-transparent px-6 py-3 font-medium text-white transition duration-200 hover:bg-zinc-800"
      >
        Generate Prompt
      </Link>

    </div>
  );
}