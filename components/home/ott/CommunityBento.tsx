import Link from "next/link";
import { ArrowUpRight, ChevronRight, Users } from "lucide-react";
import type { RowItem } from "./ContentRow";

type CommunityBentoProps = {
  items: RowItem[];
  loading: boolean;
};

const TILE_GRADIENTS = [
  "from-sky-500 via-blue-600 to-indigo-800",
  "from-fuchsia-500 via-purple-600 to-indigo-900",
  "from-emerald-500 via-teal-600 to-cyan-900",
  "from-amber-400 via-orange-500 to-rose-700",
  "from-cyan-400 via-sky-600 to-blue-900",
];

/*
 * Mosaic of recent community posts: one large tile and four
 * smaller ones, each with a hover lift and arrow.
 */
export default function CommunityBento({ items, loading }: CommunityBentoProps) {
  const tiles = items.slice(0, 5);

  if (!loading && tiles.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="flex items-end gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
            <Users className="h-5 w-5 text-brand-text" strokeWidth={2} />
            From the Community
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Fresh questions, prompts and ideas from members
          </p>
        </div>
        <Link
          href="/community"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-brand-text transition hover:border-brand/50 hover:bg-brand/5"
        >
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid auto-rows-[150px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl bg-zinc-200 ${
                  i === 0 ? "col-span-2 row-span-2" : ""
                }`}
              />
            ))
          : tiles.map((item, i) => {
              const big = i === 0;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group relative overflow-hidden rounded-2xl shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(0,119,163,0.5)] ${
                    big ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className={`animate-gradient absolute inset-0 bg-gradient-to-br ${
                        TILE_GRADIENTS[i % TILE_GRADIENTS.length]
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>

                  {item.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-text">
                      {item.badge}
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p
                      className={`font-bold leading-snug text-white ${
                        big ? "line-clamp-3 text-xl sm:text-2xl" : "line-clamp-2 text-sm"
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-300">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                          {item.subtitle.charAt(0).toUpperCase()}
                        </span>
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
