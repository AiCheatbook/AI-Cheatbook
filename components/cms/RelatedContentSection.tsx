import Link from "next/link";
import type { RelatedContentItem } from "@/lib/cms/relatedContent";
import {
  RELATED_CONTENT_LABEL,
  relatedContentHref,
} from "@/lib/cms/relatedContent";

type RelatedContentSectionProps = {
  items: RelatedContentItem[];
};

export default function RelatedContentSection({
  items,
}: RelatedContentSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-zinc-800 pt-8">
      <h2 className="text-lg font-semibold text-white">
        You might also like
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={relatedContentHref(item)}
            className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-brand/50"
          >
            <span className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">
              {item.title}
            </span>

            <span className="ml-3 shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {
                RELATED_CONTENT_LABEL[
                  item.type
                ]
              }
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
