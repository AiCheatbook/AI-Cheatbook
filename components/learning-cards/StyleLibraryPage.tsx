"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Expand,
  Search,
  X,
} from "lucide-react";
import type { GallerySettings, StyleItem } from "@/lib/cms/styleLibrary";
import { STYLE_FONT_VARIABLES, themeVariables } from "./styleTheme";

/*
 * Prompt Style Page — the public view of a "prompt_gallery"
 * Learning Card. Editorial hero with stats and a featured
 * showcase, then a filterable library of prompt cards: uncropped
 * image panels, a short description and a copyable prompt box.
 * Clicking any visual opens a full-resolution inspector.
 */

type StyleLibraryPageProps = {
  eyebrow: string | null;
  title: string;
  summary: string | null;
  howToUse: string | null;
  templateUrl: string | null;
  templateLabel: string | null;
  settings: GallerySettings;
  items: StyleItem[];
  // Rendered inside the themed background, above and below.
  header?: React.ReactNode;
  footer?: React.ReactNode;
};


function panelsOf(item: StyleItem): string[] {
  return [item.mediaUrl, ...item.extraImages].filter(
    (url): url is string => Boolean(url)
  );
}

function number(index: number) {
  return String(index + 1).padStart(2, "0");
}

function Panel({
  url,
  isVideo,
  alt,
}: {
  url: string;
  isVideo: boolean;
  alt: string;
}) {
  return isVideo ? (
    <video
      src={url}
      muted
      loop
      autoPlay
      playsInline
      className="h-full w-full object-contain"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-contain"
    />
  );
}

function PanelStrip({
  item,
  onInspect,
  className = "",
}: {
  item: StyleItem;
  onInspect?: () => void;
  className?: string;
}) {
  const panels = panelsOf(item).slice(0, 3);

  const strip = (
    <div
      className={`flex aspect-[16/9] w-full divide-x divide-[var(--sl-line)] overflow-hidden rounded-2xl bg-[var(--sl-panel)] ${className}`}
    >
      {panels.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--sl-muted)]">
          No image yet
        </div>
      ) : (
        panels.map((url, i) => (
          <div key={i} className="relative min-w-0 flex-1">
            <Panel
              url={url}
              isVideo={item.mediaType === "hosted_video" && i === 0}
              alt={`${item.title} — view ${i + 1}`}
            />
          </div>
        ))
      )}
    </div>
  );

  if (!onInspect) return strip;

  return (
    <button
      type="button"
      onClick={onInspect}
      aria-label={`Inspect ${item.title}`}
      className="group/strip relative block w-full text-left"
    >
      {strip}
      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 opacity-0 shadow transition group-hover/strip:opacity-100">
        <Expand className="h-4 w-4" strokeWidth={2} />
      </span>
    </button>
  );
}

function PromptBox({
  label,
  promptText,
}: {
  label: string;
  promptText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — the text is still selectable.
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--sl-line)] bg-[var(--sl-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--sl-line)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-[var(--sl-muted)]">
          {label}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--sl-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--sl-on-ink)] transition hover:opacity-85"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              Copy prompt
            </>
          )}
        </button>
      </div>
      <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-[11.5px] leading-relaxed text-[var(--sl-ink)]/85">
        {promptText}
      </pre>
    </div>
  );
}

function StyleCard({
  item,
  index,
  promptLabel,
  onInspect,
}: {
  item: StyleItem;
  index: number;
  promptLabel: string;
  onInspect: () => void;
}) {
  return (
    <article className="flex flex-col">
      <PanelStrip
        item={item}
        onInspect={onInspect}
        className="shadow-[0_1px_0_rgba(20,38,58,0.06)] transition group-hover/strip:shadow-lg"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sl-accent)]">
          {number(index)}
          {item.category ? ` · ${item.category}` : ""}
        </p>
        {item.featured && (
          <span className="rounded-full bg-[var(--sl-accent2-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--sl-accent2)]">
            Featured
          </span>
        )}
      </div>

      <h3 className="[font-family:var(--sl-heading)] mt-2 text-2xl font-bold tracking-tight">
        {item.title}
      </h3>

      {item.description && (
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--sl-muted)]">
          {item.description}
        </p>
      )}

      {item.promptText && (
        <PromptBox label={promptLabel} promptText={item.promptText} />
      )}
    </article>
  );
}

function Inspector({
  items,
  index,
  onClose,
  onMove,
}: {
  items: StyleItem[];
  index: number;
  onClose: () => void;
  onMove: (delta: 1 | -1) => void;
}) {
  const item = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    }

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, onMove]);

  if (!item) return null;

  const panels = panelsOf(item);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0E1620]/95 text-white"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sl-accent)]">
            {number(index)}
            {item.category ? ` · ${item.category}` : ""}
          </p>
          <p className="truncate text-lg font-bold">{item.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center gap-3 overflow-x-auto px-4 pb-6 sm:px-16">
        {panels.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original"
            className="flex h-full min-w-[70%] flex-1 items-center justify-center sm:min-w-0"
          >
            <Panel
              url={url}
              isVideo={item.mediaType === "hosted_video" && i === 0}
              alt={`${item.title} — view ${i + 1}`}
            />
          </a>
        ))}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onMove(-1)}
              aria-label="Previous style"
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 sm:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              aria-label="Next style"
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 sm:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <p className="pb-4 text-center text-xs text-white/50">
        Click an image to open the original · ← → to browse · Esc to close
      </p>
    </div>
  );
}

export default function StyleLibraryPage({
  eyebrow,
  title,
  summary,
  howToUse,
  templateUrl,
  templateLabel,
  settings,
  items,
  header,
  footer,
}: StyleLibraryPageProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [large, setLarge] = useState(false);
  const [inspecting, setInspecting] = useState<number | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.category) {
        counts.set(item.category, (counts.get(item.category) || 0) + 1);
      }
    }
    return Array.from(counts.entries());
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (activeCategory !== "all" && item.category !== activeCategory) {
          return false;
        }
        if (!q) return true;
        return [item.title, item.description, item.category]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q));
      });
  }, [items, activeCategory, search]);

  const featured =
    (settings.featuredIndex !== null && items[settings.featuredIndex]) ||
    items.find((i) => i.featured) ||
    items[0] ||
    null;
  const featuredIndex = featured ? items.indexOf(featured) : -1;

  const moveInspector = useCallback(
    (delta: 1 | -1) => {
      setInspecting((current) => {
        if (current === null || filtered.length === 0) return current;
        const position = filtered.findIndex((f) => f.index === current);
        const next =
          (position + delta + filtered.length) % filtered.length;
        return filtered[next].index;
      });
    },
    [filtered]
  );

  const closeInspector = useCallback(() => setInspecting(null), []);

  const promptLabel = settings.promptLabel || "Reusable prompt";

  return (
    <div
      className={`min-h-screen ${STYLE_FONT_VARIABLES}`}
      style={themeVariables(settings.theme, settings)}
    >
      {header}

      {/* HERO */}

      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-14 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sl-accent)]">
              {eyebrow}
            </p>
          )}

          <h1 className="[font-family:var(--sl-heading)] mt-5 text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
            {title}
            {settings.headlineAccent && (
              <span className="mt-1 block font-normal italic tracking-[-0.02em] text-[var(--sl-accent2)] [font-family:var(--sl-font-editorial),Georgia,serif]">
                {settings.headlineAccent}
              </span>
            )}
          </h1>

          {summary && (
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--sl-muted)]">
              {summary}
            </p>
          )}

          {settings.stats.length > 0 && (
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
              {settings.stats.map((stat, i) => (
                <div key={i}>
                  <dd className="text-2xl font-extrabold tracking-tight">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sl-muted)]">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        {featured && (
          <div className="relative mx-auto w-full max-w-xl lg:mr-0">
            <div className="absolute -right-6 top-1/2 hidden h-72 w-72 -translate-y-1/2 rounded-full border border-[var(--sl-accent)]/40 lg:block" />

            <div className="relative rotate-[1.5deg] rounded-3xl bg-[var(--sl-surface)] p-3 shadow-[0_30px_60px_-20px_rgba(20,38,58,0.35)] transition duration-500 hover:rotate-0">
              <PanelStrip
                item={featured}
                onInspect={() => setInspecting(featuredIndex)}
              />
              <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sl-muted)]">
                  Featured · {number(featuredIndex)}
                </p>
                <p className="truncate text-sm font-bold">{featured.title}</p>
              </div>
            </div>

            <div className="absolute -right-2 bottom-16 rotate-[-4deg] rounded-2xl bg-[var(--sl-accent)] px-4 py-3 text-[var(--sl-on-accent)] shadow-xl sm:-right-5">
              <p className="text-2xl font-extrabold leading-none">
                {items.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                {items.length === 1 ? "Prompt" : "Prompts"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* LIBRARY */}

      <section className="border-t border-[var(--sl-line)] bg-[var(--sl-surface)]">
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-10 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sl-accent)]">
                {settings.libraryEyebrow || "The prompt library"}
              </p>
              <h2 className="[font-family:var(--sl-heading)] mt-4 text-4xl font-extrabold leading-[1] tracking-[-0.035em] sm:text-6xl">
                {settings.libraryHeading || "Browse, inspect and copy."}
              </h2>
            </div>
            {settings.libraryText && (
              <p className="text-base leading-relaxed text-[var(--sl-muted)] lg:pb-2">
                {settings.libraryText}
              </p>
            )}
          </div>

          {/* Category tabs */}

          {categories.length > 1 && (
            <div className="mt-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {[["all", items.length] as [string, number], ...categories].map(
                ([name, count]) => {
                  const active = activeCategory === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActiveCategory(name)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? "border-[var(--sl-ink)] bg-[var(--sl-ink)] text-[var(--sl-on-ink)]"
                          : "border-[var(--sl-line)] bg-[var(--sl-surface)] text-[var(--sl-muted)] hover:border-[var(--sl-ink)]/40"
                      }`}
                    >
                      {name === "all" ? "All" : name}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          active
                            ? "bg-[var(--sl-on-ink)]/15 text-[var(--sl-on-ink)]"
                            : "bg-[var(--sl-soft)] text-[var(--sl-muted)]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* Search + size toggle */}

          <div
            className={`flex flex-wrap items-center gap-3 border-y border-[var(--sl-line)] py-4 ${
              categories.length > 1 ? "mt-5" : "mt-10"
            }`}
          >
            <div className="relative min-w-[220px] flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sl-muted)]"
                strokeWidth={2}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a style..."
                aria-label="Search styles"
                className="h-11 w-full rounded-xl border border-[var(--sl-line)] bg-[var(--sl-surface)] pl-10 pr-3 text-sm outline-none transition focus:border-[var(--sl-ink)]/50"
              />
            </div>

            <div className="ml-auto hidden rounded-xl border border-[var(--sl-line)] bg-[var(--sl-surface)] p-1 sm:flex">
              {[
                ["Compact", false],
                ["Large", true],
              ].map(([label, value]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => setLarge(value as boolean)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    large === value
                      ? "bg-[var(--sl-ink)] text-[var(--sl-on-ink)]"
                      : "text-[var(--sl-muted)] hover:text-[var(--sl-ink)]"
                  }`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {/* How to use */}

          {howToUse && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--sl-accent2-line)] bg-[var(--sl-accent2-soft)] px-5 py-4">
              <p className="max-w-4xl text-sm leading-relaxed text-[var(--sl-muted)]">
                <span className="mr-2 font-bold text-[var(--sl-ink)]">
                  How to use
                </span>
                {howToUse}
              </p>
              {templateUrl && (
                <a
                  href={templateUrl}
                  download
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--sl-ink)]/20 bg-[var(--sl-surface)] px-4 py-2 text-sm font-semibold text-[var(--sl-ink)] transition hover:border-[var(--sl-ink)]/50"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                  {templateLabel || "Download template"}
                </a>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <p className="text-[var(--sl-muted)]">
              Showing <span className="font-bold text-[var(--sl-ink)]">{filtered.length}</span>{" "}
              {activeCategory === "all" ? "" : `${activeCategory} `}
              {filtered.length === 1 ? "style" : "styles"}
            </p>
            <p className="hidden font-semibold text-[var(--sl-accent2)] sm:block">
              Select any visual to inspect
            </p>
          </div>

          {filtered.length > 0 ? (
            <div
              className={`mt-6 grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 ${
                large ? "" : "lg:grid-cols-3"
              }`}
            >
              {filtered.map(({ item, index }) => (
                <StyleCard
                  key={item.key}
                  item={item}
                  index={index}
                  promptLabel={promptLabel}
                  onInspect={() => setInspecting(index)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--sl-line)] bg-[var(--sl-surface)] p-10 text-center text-[var(--sl-muted)]">
              No styles match your search.
            </div>
          )}
        </div>
      </section>

      {footer && (
        <div className="bg-[var(--sl-surface)] pb-16">{footer}</div>
      )}

      {inspecting !== null && (
        <Inspector
          items={items}
          index={inspecting}
          onClose={closeInspector}
          onMove={moveInspector}
        />
      )}
    </div>
  );
}
