"use client";

import Link from "next/link";

const tools = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

export default function TrendingTags() {
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-3">
      {tools.map((tool) => (
        <Link
          key={tool}
          href={`/search?tool=${encodeURIComponent(tool)}`}
          className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-400"
        >
          {tool}
        </Link>
      ))}
    </div>
  );
}