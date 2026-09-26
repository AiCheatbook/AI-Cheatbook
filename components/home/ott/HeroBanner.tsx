"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, Play } from "lucide-react";

export type HeroItem = {
  id: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  href: string;
  label: string;
};

type HeroBannerProps = {
  items: HeroItem[];
  loading: boolean;
};

const ROTATE_MS = 7000;

/*
 * Streaming-app style featured banner: a large rounded slide with
 * the lesson image, title and actions, rotating through the newest
 * Learning Cards. Dots and arrows let visitors switch slides.
 */
export default function HeroBanner({ items, loading }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [count]);

  if (loading) {
    return (
      <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8">
        <div className="h-[340px] animate-pulse rounded-2xl bg-zinc-200 sm:h-[440px]" />
      </section>
    );
  }

  const item = items[index % Math.max(count, 1)] || null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8">
      <div className="relative h-[380px] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg sm:h-[440px]">
        {item?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full animate-[fadeIn_600ms_ease] object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00ABE4_0%,_#0077A3_40%,_#0b1f2a_85%)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950/60 to-transparent" />

        <div className="relative flex h-full max-w-2xl flex-col justify-end p-6 sm:p-10">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            <GraduationCap className="h-4 w-4" strokeWidth={2} />
            {item?.label || "AI Learning"}
          </p>

          <h1 className="mt-3 line-clamp-2 text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            {item?.title || "Learn AI, one card at a time"}
          </h1>

          <p className="mt-3 line-clamp-2 text-base text-zinc-200 sm:text-lg">
            {item?.excerpt ||
              "Short, practical lessons that explain AI concepts in plain language."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={item?.href || "/learning"}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-base font-bold text-white shadow transition hover:bg-brand-dark"
            >
              <Play className="h-5 w-5 fill-white" strokeWidth={2} />
              Start Learning
            </Link>

            <Link
              href="/learning"
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2.5 text-base font-bold text-white backdrop-blur transition hover:bg-white/30"
            >
              All Lessons
            </Link>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="absolute right-16 top-5 hidden h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="absolute right-5 top-5 hidden h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35 sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-5 right-6 flex gap-2">
              {items.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index % count
                      ? "w-8 bg-white"
                      : "w-3 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
