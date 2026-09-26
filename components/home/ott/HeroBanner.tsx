import Link from "next/link";
import { Play, Info } from "lucide-react";

export type HeroItem = {
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  href: string;
  label: string;
};

type HeroBannerProps = {
  item: HeroItem | null;
  loading: boolean;
};

/*
 * Full-width featured banner at the top of the Netflix-style
 * homepage: backdrop image faded into the page background, with
 * the title, a short excerpt and two call-to-action buttons.
 */
export default function HeroBanner({ item, loading }: HeroBannerProps) {
  if (loading) {
    return (
      <section className="h-[56vh] min-h-[360px] animate-pulse bg-zinc-900" />
    );
  }

  const title = item?.title || "Learn, Create & Grow with AI";
  const excerpt =
    item?.excerpt ||
    "Powerful prompts, practical AI lessons and the latest AI news, all in one place.";

  return (
    <section className="relative h-[62vh] min-h-[420px] max-h-[640px] overflow-hidden">
      {item?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00ABE4_0%,_#0b3a4f_35%,_#141414_75%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#141414] to-transparent" />

      <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-16 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">
          {item?.label || "AI Cheatbook"}
        </p>

        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white drop-shadow sm:text-5xl">
          {title}
        </h1>

        <p className="mt-4 line-clamp-3 max-w-xl text-base text-zinc-200 sm:text-lg">
          {excerpt}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={item?.href || "/prompts"}
            className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-white/80"
          >
            <Play className="h-5 w-5 fill-black" strokeWidth={2} />
            {item ? "Open" : "Browse Prompts"}
          </Link>

          <Link
            href="/community"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-500/60 px-6 py-2.5 text-base font-bold text-white transition hover:bg-zinc-500/40"
          >
            <Info className="h-5 w-5" strokeWidth={2} />
            Join the Community
          </Link>
        </div>
      </div>
    </section>
  );
}
