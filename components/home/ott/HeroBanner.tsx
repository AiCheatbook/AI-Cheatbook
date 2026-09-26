"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Pause,
  Play,
} from "lucide-react";

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

const FALLBACK_BACKGROUNDS = [
  "bg-[radial-gradient(ellipse_at_top_right,_#00ABE4_0%,_#0077A3_40%,_#0b1f2a_85%)]",
  "bg-[radial-gradient(ellipse_at_bottom_left,_#7c3aed_0%,_#312e81_45%,_#0b1020_85%)]",
  "bg-[radial-gradient(ellipse_at_top_left,_#10b981_0%,_#065f46_45%,_#051b16_85%)]",
];

/*
 * Cinematic featured slider for the newest Learning Cards:
 * crossfading slides with a slow Ken Burns zoom, text that rises
 * in per slide, a progress bar per slide, and (on large screens)
 * an "Up next" list. Pauses while hovered.
 */
export default function HeroBanner({ items, loading }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS
    );
    return () => clearTimeout(timer);
  }, [count, paused, index]);

  if (loading) {
    return (
      <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8">
        <div className="h-[420px] animate-pulse rounded-3xl bg-zinc-200 sm:h-[520px]" />
      </section>
    );
  }

  const current = items[index % Math.max(count, 1)] || null;
  const upNext = count > 1
    ? Array.from({ length: Math.min(count - 1, 3) }, (_, i) => {
        const at = (index + 1 + i) % count;
        return { item: items[at], at };
      })
    : [];

  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8">
      <div
        className="relative h-[460px] overflow-hidden rounded-3xl bg-zinc-950 shadow-[0_30px_80px_-30px_rgba(0,119,163,0.55)] sm:h-[540px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Slides */}

        {(count > 0 ? items : [null]).map((slide, i) => {
          const active = i === index % Math.max(count, 1);
          return (
            <div
              key={slide?.id || "empty"}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {slide?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={active ? `${slide.id}-${index}` : slide.id}
                  src={slide.imageUrl}
                  alt=""
                  className={`h-full w-full object-cover ${
                    active ? "animate-ken-burns" : ""
                  }`}
                />
              ) : (
                <div
                  className={`animate-gradient h-full w-full ${
                    FALLBACK_BACKGROUNDS[i % FALLBACK_BACKGROUNDS.length]
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* Readability layers */}

        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        <div className="animate-float-blob pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />

        {/* Copy */}

        <div
          key={current?.id || "empty"}
          className="relative flex h-full max-w-2xl flex-col justify-end p-6 pb-20 sm:p-12 sm:pb-24"
        >
          <p className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
            <GraduationCap className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
            {current?.label || "AI Learning"}
          </p>

          <h1
            className="animate-fade-up mt-4 line-clamp-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
            style={{ animationDelay: "90ms" }}
          >
            {current?.title || "Learn AI, one card at a time"}
          </h1>

          <p
            className="animate-fade-up mt-4 line-clamp-2 max-w-xl text-base text-zinc-200 sm:text-lg"
            style={{ animationDelay: "180ms" }}
          >
            {current?.excerpt ||
              "Short, practical lessons that explain AI concepts in plain language."}
          </p>

          <div
            className="animate-fade-up mt-7 flex flex-wrap gap-3"
            style={{ animationDelay: "270ms" }}
          >
            <Link
              href={current?.href || "/learning"}
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-bold text-white shadow-[0_10px_30px_-8px_rgba(0,171,228,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              <Play className="h-5 w-5 fill-white transition group-hover:scale-110" strokeWidth={2} />
              Start Learning
            </Link>

            <Link
              href="/learning"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Browse all lessons
            </Link>
          </div>
        </div>

        {/* Up next (large screens) */}

        {upNext.length > 0 && (
          <div className="absolute bottom-20 right-6 top-6 hidden w-72 flex-col justify-end gap-3 lg:flex">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              Up next
            </p>
            {upNext.map(({ item, at }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(at)}
                className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2 text-left backdrop-blur-md transition hover:-translate-x-1 hover:bg-white/20"
              >
                <span className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-white/10">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-brand">
                    {item.label}
                  </span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {item.title}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Controls */}

        {count > 1 && (
          <div className="absolute inset-x-6 bottom-6 flex items-center gap-4 sm:inset-x-12">
            <div className="flex flex-1 gap-2">
              {items.map((slide, i) => {
                const active = i === index % count;
                const done = i < index % count;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Show slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"
                  >
                    <span
                      key={active ? `run-${index}` : "idle"}
                      className={`absolute inset-0 origin-left rounded-full bg-white ${
                        done ? "" : active ? "" : "scale-x-0"
                      }`}
                      style={
                        active
                          ? {
                              animation: `progressFill ${ROTATE_MS}ms linear forwards`,
                              animationPlayState: paused ? "paused" : "running",
                            }
                          : undefined
                      }
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                onClick={() => setPaused((p) => !p)}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 sm:flex"
              >
                {paused ? <Play className="h-4 w-4 fill-white" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => setIndex((i) => (i + 1) % count)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
