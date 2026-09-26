"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type RowItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href: string;
  badge?: string | null;
};

type ContentRowProps = {
  title: string;
  seeAllHref?: string;
  items: RowItem[];
  loading: boolean;
  variant?: "poster" | "landscape";
};

// Placeholder backgrounds for items without an image, picked
// by position so neighbouring tiles look different.
const FALLBACK_GRADIENTS = [
  "from-sky-600 to-indigo-900",
  "from-fuchsia-600 to-purple-950",
  "from-emerald-600 to-teal-950",
  "from-amber-500 to-rose-900",
  "from-cyan-500 to-blue-950",
];

/*
 * One Netflix-style row: a heading and a sideways-scrolling strip
 * of cards, with arrow buttons on larger screens. Rows with no
 * items are hidden once loading finishes.
 */
export default function ContentRow({
  title,
  seeAllHref,
  items,
  loading,
  variant = "landscape",
}: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!loading && items.length === 0) {
    return null;
  }

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  const cardSize =
    variant === "poster"
      ? "w-[38vw] sm:w-[200px] aspect-[4/5]"
      : "w-[70vw] sm:w-[300px] aspect-video";

  return (
    <section className="group/row relative">
      <div className="mx-auto flex max-w-[1400px] items-baseline gap-3 px-4 sm:px-8">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-semibold text-brand opacity-80 transition hover:opacity-100"
          >
            See all ›
          </Link>
        )}
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollBy(-1)}
          className="absolute inset-y-0 left-0 z-10 hidden w-10 items-center justify-center bg-black/50 text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div
          ref={scrollerRef}
          className="flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 py-3 [scrollbar-width:none] sm:scroll-px-8 sm:gap-3 sm:px-8"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${cardSize} shrink-0 animate-pulse rounded-md bg-zinc-800`}
                />
              ))
            : items.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${cardSize} group/card relative shrink-0 snap-start overflow-hidden rounded-md bg-zinc-800 ring-white/80 transition duration-200 hover:z-10 hover:scale-105 hover:ring-2 focus-visible:ring-2`}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${
                        FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]
                      }`}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {item.badge && (
                    <span className="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
                      {item.badge}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-zinc-300">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
        </div>

        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollBy(1)}
          className="absolute inset-y-0 right-0 z-10 hidden w-10 items-center justify-center bg-black/50 text-white opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>
    </section>
  );
}
