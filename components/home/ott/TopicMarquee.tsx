import Link from "next/link";
import { Sparkles } from "lucide-react";

type TopicMarqueeProps = {
  topics: string[];
};

/*
 * Endlessly scrolling strip of learning topics under the hero.
 * The list is rendered twice so the loop is seamless; it pauses
 * on hover.
 */
export default function TopicMarquee({ topics }: TopicMarqueeProps) {
  if (topics.length === 0) return null;

  // Repeat short lists so one copy is wider than the screen.
  const base =
    topics.length >= 8
      ? topics
      : Array.from({ length: Math.ceil(8 / topics.length) }, () => topics).flat();

  return (
    <div className="group relative mx-auto mt-6 max-w-[1400px] overflow-hidden px-4 sm:px-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:left-8" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:right-8" />

      <div className="animate-marquee flex w-max gap-3 group-hover:[animation-play-state:paused]">
        {[...base, ...base].map((topic, i) => (
          <Link
            key={`${topic}-${i}`}
            href="/learning"
            aria-hidden={i >= base.length}
            tabIndex={i >= base.length ? -1 : undefined}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-brand hover:text-brand-text"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
            {topic}
          </Link>
        ))}
      </div>
    </div>
  );
}
