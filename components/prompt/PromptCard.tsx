"use client";

import Image from "next/image";
import Link from "next/link";
import { resolveThumbnailUrl } from "@/lib/cms/mediaDisplay";

type PromptCardProps = {
  slug: string;
  title: string;
  type: string;
  category: string;
  description: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  mediaSource?: string | null;
  thumbnailUrl?: string | null;
  aiTools: string[];
  keywords?: string[];
};

export default function PromptCard({
  slug,
  title,
  category,
  mediaUrl,
  mediaSource,
  thumbnailUrl,
}: PromptCardProps) {
  const resolvedUrl =
    resolveThumbnailUrl(
      thumbnailUrl,
      mediaUrl,
      mediaSource
    );

  const image =
    resolvedUrl ||
    (slug === "static-shot"
      ? "/concepts/static-shot.jpg"
      : "/prompts/demo.jpg");

  return (
    <Link
      href={`/prompt/${slug}`}
      className="group block"
    >
      <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-2xl hover:shadow-brand/10">

        {/* Image */}

        <div className="relative aspect-4/5 overflow-hidden bg-zinc-950">

          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />

          {/* Hover Overlay */}

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-70 transition duration-300 group-hover:opacity-100" />

          {/* Open Indicator */}

          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100">
            →
          </div>

        </div>

        {/* Card Info */}

        <div className="p-4">

          <h3 className="line-clamp-2 text-lg font-semibold text-white transition duration-200 group-hover:text-brand">
            {title}
          </h3>

          {category && (
            <p className="mt-2 text-sm text-zinc-600">
              {category}
            </p>
          )}

        </div>

      </article>
    </Link>
  );
}