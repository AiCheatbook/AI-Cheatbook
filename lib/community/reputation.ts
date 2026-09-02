/*
 * Reputation is computed on the fly from
 * real activity — no stored/cached score
 * to keep in sync, no trigger complexity.
 * Fine at this community's scale; worth
 * revisiting with a cached column + trigger
 * if the community grows large enough that
 * this aggregation becomes slow.
 */

export type ReputationStats = {
  threadCount: number;
  replyCount: number;
  threadUpvotesReceived: number;
  replyUpvotesReceived: number;
  acceptedAnswerCount: number;
};

export function calculateReputation(
  stats: ReputationStats
): number {
  return (
    stats.threadCount * 3 +
    stats.replyCount * 1 +
    stats.threadUpvotesReceived * 2 +
    stats.replyUpvotesReceived * 1 +
    stats.acceptedAnswerCount * 15
  );
}

export type BadgeTier = {
  name: string;
  minScore: number;
};

const BADGE_TIERS: BadgeTier[] = [
  { name: "Top Contributor", minScore: 200 },
  { name: "Community Mentor", minScore: 100 },
  { name: "Prompt Expert", minScore: 60 },
  { name: "Problem Solver", minScore: 30 },
  { name: "AI Explorer", minScore: 10 },
  { name: "Contributor", minScore: 0 },
];

export function badgeForScore(
  score: number
): string {
  const tier = BADGE_TIERS.find(
    (t) => score >= t.minScore
  );

  return tier?.name || "Contributor";
}
