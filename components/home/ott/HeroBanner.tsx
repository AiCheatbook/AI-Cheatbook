"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
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

// Film-grain texture layered over the scene.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const FALLBACK_BACKGROUNDS = [
  "bg-[linear-gradient(135deg,#0b1f2a,#0077A3_45%,#6d28d9)]",
  "bg-[linear-gradient(135deg,#1e1b4b,#7c3aed_45%,#db2777)]",
  "bg-[linear-gradient(135deg,#052e2b,#0f766e_45%,#0891b2)]",
];

// Split a title so its last word can carry the gradient.
function splitTitle(title: string): [string, string] {
  const trimmed = title.trim();
  const cut = trimmed.lastIndexOf(" ");
  if (cut === -1) return ["", trimmed];
  return [trimmed.slice(0, cut), trimmed.slice(cut + 1)];
}

/*
 * Full-bleed, immersive hero for the newest Learning Cards. The
 * active slide fills the whole width (slow Ken Burns zoom) and
 * melts into the page below; aurora glows and film grain sit on
 * top. Copy rises in per slide, the last word of the title gets
 * an animated gradient, and on large screens a tilted 3D stack of
 * lesson cards follows the pointer. Pauses on hover.
 */
export default function HeroBanner({ items, loading }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS
    );
    return () => clearTimeout(timer);
  }, [count, paused, index]);

  // Pointer position drives the card-stack tilt via CSS variables.
  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const el = sceneRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(x * 14).toFixed(2)}deg`);
    el.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function resetPointer() {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }

  if (loading) {
    return (
      <section className="relative h-[78vh] min-h-[520px] max-h-[780px] animate-pulse bg-gradient-to-b from-zinc-200 to-white" />
    );
  }

  const active = index % Math.max(count, 1);
  const current = items[active] || null;
  const [lead, lastWord] = splitTitle(
    current?.title || "Learn AI, one card at a time"
  );
  const stack = count > 0
    ? Array.from({ length: Math.min(count, 3) }, (_, i) => {
        const at = (active + i) % count;
        return { item: items[at], at, depth: i };
      })
    : [];

  return (
    <section
      ref={sceneRef}
      className="relative h-[82vh] min-h-[560px] max-h-[820px] overflow-hidden bg-zinc-950 [--glow-x:30%] [--glow-y:40%] [--tilt-x:0deg] [--tilt-y:0deg]"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        resetPointer();
        setPaused(false);
      }}
      onPointerEnter={() => setPaused(true)}
    >
      {/* Slides */}

      {(count > 0 ? items : [null]).map((slide, i) => {
        const isActive = i === active;
        return (
          <div
            key={slide?.id || "empty"}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            {slide?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={isActive ? `${slide.id}-${index}` : slide.id}
                src={slide.imageUrl}
                alt=""
                className={`h-full w-full object-cover ${
                  isActive ? "animate-ken-burns" : ""
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

      {/* Atmosphere: aurora, pointer glow, grain, fades */}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/45 to-zinc-950/10" />
      <div className="animate-float-blob pointer-events-none absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-brand/40 mix-blend-screen blur-3xl" />
      <div
        className="animate-float-blob pointer-events-none absolute right-[-6rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/30 mix-blend-screen blur-3xl"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="animate-float-blob pointer-events-none absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-violet-500/25 mix-blend-screen blur-3xl"
        style={{ animationDelay: "-9s" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_var(--glow-x)_var(--glow-y),rgba(0,171,228,0.18),transparent_60%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-white from-15% via-white/80 to-transparent" />

      {/* Content */}

      <div className="relative mx-auto grid h-full max-w-[1400px] items-center gap-10 px-5 pb-28 pt-10 sm:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div key={current?.id || "empty"} className="max-w-2xl">
          <div className="animate-fade-up flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-900 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" strokeWidth={2.5} />
              {active === 0 ? "New drop" : "Trending lesson"}
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {current?.label || "AI Learning"}
            </span>
          </div>

          <h1
            className="animate-fade-up mt-5 text-[2.6rem] font-black leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "90ms" }}
          >
            {lead && <>{lead} </>}
            <span className="animate-gradient bg-[linear-gradient(90deg,#38d6ff,#a78bfa,#f472b6,#38d6ff)] bg-clip-text text-transparent">
              {lastWord}
            </span>
          </h1>

          <p
            className="animate-fade-up mt-5 line-clamp-2 max-w-xl text-base font-medium text-zinc-100/90 sm:text-lg"
            style={{ animationDelay: "180ms" }}
          >
            {current?.excerpt ||
              "Short, visual lessons that make AI click, in minutes, not hours."}
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "270ms" }}
          >
            <Link
              href={current?.href || "/learning"}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-extrabold text-zinc-950 shadow-[0_12px_40px_-10px_rgba(56,214,255,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-10px_rgba(167,139,250,0.95)]"
            >
              <Play className="h-5 w-5 fill-zinc-950" strokeWidth={2} />
              Start learning
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/learning"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Explore all
            </Link>
          </div>
        </div>

        {/* 3D card stack (large screens) */}

        {stack.length > 0 && (
          <div className="relative hidden h-[420px] [perspective:1200px] lg:block">
            <div
              className="relative h-full w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
              style={{
                transform:
                  "rotateX(var(--tilt-x)) rotateY(calc(var(--tilt-y) - 8deg))",
              }}
            >
              {[...stack].reverse().map(({ item, at, depth }) => (
                <button
                  key={`${item.id}-${depth}`}
                  type="button"
                  onClick={() => setIndex(at)}
                  aria-label={`Show ${item.title}`}
                  className="group absolute left-1/2 top-1/2 aspect-[4/5] w-[250px] overflow-hidden rounded-[28px] border border-white/25 bg-zinc-800 text-left shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] transition-all duration-700 ease-out hover:border-white/60"
                  style={{
                    transform: `translate(-50%, -50%) translateX(${depth * 70}px) translateZ(${-depth * 90}px) rotateZ(${depth * 5}deg)`,
                    opacity: 1 - depth * 0.18,
                    zIndex: 10 - depth,
                  }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-sky-500 to-violet-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                      {depth === 0 ? "Now showing" : "Up next"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white">
                      {item.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-8 z-10">
          <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-5 sm:px-8">
            <p className="shrink-0 font-black tabular-nums tracking-tight text-zinc-900">
              <span className="text-3xl">{String(active + 1).padStart(2, "0")}</span>
              <span className="text-base text-zinc-400"> / {String(count).padStart(2, "0")}</span>
            </p>

            <div className="flex flex-1 gap-2">
              {items.map((slide, i) => {
                const isActive = i === active;
                const done = i < active;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Show slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900/15"
                  >
                    <span
                      key={isActive ? `run-${index}` : "idle"}
                      className={`absolute inset-0 origin-left rounded-full bg-gradient-to-r from-brand via-violet-500 to-fuchsia-500 ${
                        done || isActive ? "" : "scale-x-0"
                      }`}
                      style={
                        isActive
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
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-zinc-900/10 bg-white/80 text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white sm:flex"
              >
                {paused ? <Play className="h-4 w-4 fill-zinc-900" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-900/10 bg-white/80 text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => setIndex((i) => (i + 1) % count)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm transition hover:bg-zinc-800"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
