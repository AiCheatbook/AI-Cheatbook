"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CommunityHeroProps = {
  memberCount: number;
  discussionCount: number;
  answerCount: number;
};

function useCountUp(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      return;
    }

    const duration = 900;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(
        1,
        (now - start) / duration
      );

      setValue(
        Math.floor(progress * target)
      );

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target]);

  return value;
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }

  return String(n);
}

export default function CommunityHero({
  memberCount,
  discussionCount,
  answerCount,
}: CommunityHeroProps) {
  const members = useCountUp(memberCount);
  const discussions = useCountUp(
    discussionCount
  );
  const answers = useCountUp(answerCount);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-8 text-center sm:p-12">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">
        The AI Community, Built by
        People Who Actually Use AI.
      </h1>

      <p className="mt-3 text-zinc-400">
        Ask. Answer. Challenge. Discover.
        Improve.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/discussions/new?kind=question"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Ask a Question
        </Link>

        <Link
          href="/community/polls/new"
          className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Create a Poll
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-zinc-500">
        <span>
          <strong className="text-white">
            {formatCount(members)}
          </strong>{" "}
          Members
        </span>
        <span>
          <strong className="text-white">
            {formatCount(discussions)}
          </strong>{" "}
          Discussions
        </span>
        <span>
          <strong className="text-white">
            {formatCount(answers)}
          </strong>{" "}
          Answers
        </span>
      </div>
    </section>
  );
}
