import Link from "next/link";
import { ChevronRight, Newspaper } from "lucide-react";
import type { RowItem } from "./ContentRow";

type NewsListProps = {
  items: RowItem[];
  loading: boolean;
};

/*
 * Compact, secondary AI News block: small thumbnail cards in a
 * grid, deliberately quieter than the learning rows above.
 */
export default function NewsList({ items, loading }: NewsListProps) {
  const shown = items.slice(0, 6);

  if (!loading && shown.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="flex items-end gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">
            <Newspaper className="h-5 w-5 text-zinc-500" strokeWidth={2} />
            AI News
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">Quick updates from the AI world</p>
        </div>
        <Link
          href="/news"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400"
        >
          All news <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
            ))
          : shown.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              >
                <span className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 group-hover:text-brand-text">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="mt-1 block truncate text-xs text-zinc-500">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}
