import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

/*
 * Animated gradient banner inviting visitors to start their own
 * AI community.
 */
export default function CommunityCta() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-8">
      <div className="animate-gradient relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#0077A3,#00ABE4,#6366f1,#0077A3)] p-8 text-white shadow-[0_30px_60px_-25px_rgba(0,119,163,0.7)] sm:p-12">
        <div className="animate-float-blob pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl" />
        <div
          className="animate-float-blob pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-300/30 blur-2xl"
          style={{ animationDelay: "-6s" }}
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              For creators
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Build your own AI community
            </h2>
            <p className="mt-3 text-base text-white/85 sm:text-lg">
              Share lessons, prompts and courses with your members, all in
              one place.
            </p>
          </div>

          <Link
            href="/groups/new"
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold text-brand-text shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Create your community
          </Link>
        </div>
      </div>
    </section>
  );
}
