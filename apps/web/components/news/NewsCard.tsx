import Image from "next/image";

type NewsCardProps = {
  title: string;
  image: string;
};

export default function NewsCard({
  title,
  image,
}: NewsCardProps) {
  return (
    <article className="group flex aspect-[4/5] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-orange-500/50">

      {/* Image */}

      <div className="relative aspect-[16/10] shrink-0 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}

      <div className="flex min-h-0 flex-1 flex-col p-4">

        <span className="text-xs font-medium text-orange-500">
          AI News
        </span>

        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white transition group-hover:text-orange-400">
          {title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-400">
          Learn what&apos;s new and how it affects
          creators and developers.
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">

          <span className="text-xs text-zinc-500">
            2 min read
          </span>

          <button
            type="button"
            className="text-xs font-medium text-orange-500 transition hover:text-orange-400"
          >
            Read →
          </button>

        </div>

      </div>

    </article>
  );
}