export type Level = {
  level: number;
  label: string;
  minPoints: number;
};

// Skool-style 9-level curve — each level requires
// meaningfully more points than the last, so early
// levels come quickly (encouraging new members) while
// the top levels are a real long-term achievement.
export const LEVELS: Level[] = [
  { level: 1, label: "Newcomer", minPoints: 0 },
  { level: 2, label: "Regular", minPoints: 5 },
  { level: 3, label: "Contributor", minPoints: 15 },
  { level: 4, label: "Active Member", minPoints: 30 },
  { level: 5, label: "Engaged Member", minPoints: 50 },
  { level: 6, label: "Veteran", minPoints: 100 },
  { level: 7, label: "Expert", minPoints: 200 },
  { level: 8, label: "Leader", minPoints: 400 },
  { level: 9, label: "Legend", minPoints: 800 },
];

export function getLevelForPoints(points: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) {
      current = level;
    }
  }
  return current;
}

// Returns null when already at the max level (level 9)
// — there's no "next" to progress toward.
export function getNextLevel(points: number): Level | null {
  const current = getLevelForPoints(points);
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return next || null;
}

export function getProgressToNextLevel(points: number): {
  current: Level;
  next: Level | null;
  pointsIntoLevel: number;
  pointsForNextLevel: number | null;
  percent: number;
} {
  const current = getLevelForPoints(points);
  const next = getNextLevel(points);

  const pointsIntoLevel = points - current.minPoints;
  const pointsForNextLevel = next ? next.minPoints - current.minPoints : null;

  const percent =
    next && pointsForNextLevel
      ? Math.min(100, Math.round((pointsIntoLevel / pointsForNextLevel) * 100))
      : 100;

  return {
    current,
    next,
    pointsIntoLevel,
    pointsForNextLevel,
    percent,
  };
}
