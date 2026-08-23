import type { UserPlan } from "./modelConfig";

export type UsageInfo = {
  used: number;
  limit: number;
  remaining: number;
};

export const USAGE_LIMITS: Record<
  UserPlan,
  number
> = {
  free: 5,
  paid: 100,
};

export const USAGE_STORAGE_KEY =
  "ai-cheatbook-daily-usage";

function getTodayKey(): string {
  const today = new Date();

  return today.toISOString().split("T")[0];
}

export function getUsage(
  plan: UserPlan
): UsageInfo {
  const limit = USAGE_LIMITS[plan];

  /*
   * Server-side safety.
   */

  if (typeof window === "undefined") {
    return {
      used: 0,
      limit,
      remaining: limit,
    };
  }

  try {
    const stored = JSON.parse(
      localStorage.getItem(
        USAGE_STORAGE_KEY
      ) || "{}"
    );

    const today = getTodayKey();

    const used =
      stored.date === today
        ? Number(stored.used || 0)
        : 0;

    const safeUsed = Math.max(
      0,
      Number.isFinite(used)
        ? used
        : 0
    );

    return {
      used: safeUsed,
      limit,
      remaining: Math.max(
        0,
        limit - safeUsed
      ),
    };
  } catch (error) {
    console.error(
      "Failed to read usage data:",
      error
    );

    return {
      used: 0,
      limit,
      remaining: limit,
    };
  }
}

export function canGenerate(
  plan: UserPlan
): boolean {
  const usage = getUsage(plan);

  return usage.remaining > 0;
}

export function recordGeneration(
  plan: UserPlan
): UsageInfo {
  const limit = USAGE_LIMITS[plan];

  /*
   * Server-side safety.
   */

  if (typeof window === "undefined") {
    return {
      used: 0,
      limit,
      remaining: limit,
    };
  }

  const currentUsage = getUsage(plan);

  /*
   * Never exceed the configured limit.
   */

  if (currentUsage.remaining <= 0) {
    return currentUsage;
  }

  const today = getTodayKey();

  const newUsed =
    currentUsage.used + 1;

  try {
    localStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify({
        date: today,
        used: newUsed,
      })
    );
  } catch (error) {
    console.error(
      "Failed to save usage data:",
      error
    );
  }

  return {
    used: newUsed,
    limit,
    remaining: Math.max(
      0,
      limit - newUsed
    ),
  };
}