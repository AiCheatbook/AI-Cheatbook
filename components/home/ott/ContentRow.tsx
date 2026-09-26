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
  variant?: "feature" | "poster" | "landscape" | "top10";
  subtitle?: string;
  icon?: React.ReactNode;
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
  icon,
  subtitle,
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
    variant === "feature"
      ? "w-[46vw] sm:w-[250px] aspect-[4/5]"
      : variant === "top10"
        ? "w-[36vw] sm:w-[180px] aspect-[4/5]"
        : variant === "poster"
          ? "w-[38vw] sm:w-[190px] aspect-[4/5]"
          : "w-[62vw] sm:w-[260px] aspect-video";

  const shownItems = variant === "top10" ? items.slice(0, 10) : items;

  return (
    <section className="group/row relative">
      <div className="mx-auto flex max-w-[1400px] items-end gap-3 px-4 sm:px-8">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-brand-text transition hover:border-brand/50 hover:bg-brand/5"
          >
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative mx-auto max-w-[1400px]">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollBy(-1)}
          className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 opacity-0 shadow-lg ring-1 ring-zinc-200 transition hover:bg-zinc-50 group-hover/row:opacity-100 sm:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          ref={scrollerRef}
          className={`flex snap-x overflow-x-auto scroll-px-4 px-4 pb-5 pt-4 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 ${
            variant === "top10" ? "gap-5 pl-6 sm:gap-8 sm:pl-10" : "gap-3 sm:gap-4"
          }`}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${cardSize} shrink-0 animate-pulse rounded-2xl bg-zinc-200`}
                />
              ))
            : shownItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex shrink-0 snap-start items-end"
                >
                {variant === "top10" && (
                  <span
                    aria-hidden
                    className="-mr-4 select-none text-[110px] font-black leading-[0.8] tracking-tighter text-white sm:-mr-6 sm:text-[150px]"
                    style={{ WebkitTextStroke: "3px #0077A3" }}
                  >
                    {index + 1}
                  </span>
                )}
                <Link
                  href={item.href}
                  className={`${cardSize} group/card relative shrink-0 overflow-hidden rounded-2xl bg-zinc-200 shadow-md transition duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-12px_rgba(0,119,163,0.55)] hover:ring-2 hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand`}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover/card:scale-110"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${
                        FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]
                      }`}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover/card:translate-x-full" />

                  {item.badge && (
                    <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                      {item.badge}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3 transition duration-300 group-hover/card:-translate-y-1">
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
                </div>
              ))}
        </div>

        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollBy(1)}
          className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 opacity-0 shadow-lg ring-1 ring-zinc-200 transition hover:bg-zinc-50 group-hover/row:opacity-100 sm:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
