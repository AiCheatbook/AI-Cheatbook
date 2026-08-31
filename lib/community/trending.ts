/*
 * A simple "hot" score — similar in spirit
 * to Reddit's ranking: recent content with
 * real engagement rises, older content
 * decays even if it once had a lot of
 * votes. Not the full "Recency + Engagement
 * + Quality + Participation Velocity +
 * Relevance" system described in the spec —
 * that's a Phase E refinement once there's
 * enough real usage data to tune against.
 */

export function trendingScore(
  voteCount: number,
  replyCount: number,
  createdAt: string
): number {
  const hoursOld =
    (Date.now() -
      new Date(createdAt).getTime()) /
    (1000 * 60 * 60);

  const engagement =
    voteCount * 2 + replyCount;

  return (
    engagement / Math.pow(hoursOld + 2, 1.5)
  );
}

export function isNew(
  createdAt: string
): boolean {
  const hoursOld =
    (Date.now() -
      new Date(createdAt).getTime()) /
    (1000 * 60 * 60);

  return hoursOld < 24;
}
