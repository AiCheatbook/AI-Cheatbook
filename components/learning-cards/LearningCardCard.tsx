import Image from "next/image";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

type LearningCardCardProps = {
  title: string;
  summary: string | null;
  category: string | null;
  coverImage: string | null;
  mediaSource: string | null;
  thumbnailUrl: string | null;
  priority?: boolean;
};

export default function LearningCardCard({
  title,
  summary,
  category,
  coverImage,
  mediaSource,
  thumbnailUrl,
  priority = false,
}: LearningCardCardProps) {
  const displayImage =
    resolveThumbnailUrl(
      thumbnailUrl,
      coverImage,
      mediaSource
    ) || "/news/news1.jpg";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-md">

      {/* Thumbnail (always 4:5) */}

      <div className="relative aspect-[4/5] shrink-0 overflow-hidden">
        <Image
          src={displayImage}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
          priority={priority}
        />
      </div>

      {/* Content */}

      <div className="flex min-h-0 flex-1 flex-col p-4">

        {category && (
          <span className="text-xs font-medium text-brand-text">
            {category}
          </span>
        )}

        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-zinc-900 transition group-hover:text-brand-text">
          {title}
        </h3>

        {summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-600">
            {summary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <button
            type="button"
            className="-m-2 p-2 text-xs font-medium text-brand-text transition hover:text-brand-text-hover"
          >
            Read →
          </button>
        </div>

      </div>

    </article>
  );
}
