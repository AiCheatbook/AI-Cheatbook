import { useCallback, useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import {
  canGenerate,
  getUsage,
  recordGeneration,
  USAGE_LIMITS,
} from "../usageConfig";
import type { UserPlan } from "../modelConfig";

const REGISTERED_DAILY_LIMIT = 50;

export type UsageInfo = {
  used: number;
  limit: number;
  remaining: number;
};

/*
 * One shared usage source both generators
 * read from. Registered users get their
 * real, server-tracked count (matches
 * /account exactly); anonymous visitors get
 * the local, browser-only count.
 */

export function useUsageTracking(
  isLoggedIn: boolean
) {
  const anonymousPlan: UserPlan = "free";

  const [anonymousUsage, setAnonymousUsage] =
    useState<UsageInfo>(() => ({
      used: 0,
      limit: USAGE_LIMITS[anonymousPlan],
      remaining:
        USAGE_LIMITS[anonymousPlan],
    }));

  const [registeredUsage, setRegisteredUsage] =
    useState<UsageInfo>({
      used: 0,
      limit: REGISTERED_DAILY_LIMIT,
      remaining: REGISTERED_DAILY_LIMIT,
    });

  const refreshRegisteredUsage =
    useCallback(async () => {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await supabaseAuthClient
        .from("profiles")
        .select(
          "real_ai_used_today, real_ai_usage_date"
        )
        .eq("id", user.id)
        .single();

      if (!data) {
        return;
      }

      const today = new Date()
        .toISOString()
        .slice(0, 10);

      const usedToday =
        data.real_ai_usage_date === today
          ? data.real_ai_used_today
          : 0;

      setRegisteredUsage({
        used: usedToday,
        limit: REGISTERED_DAILY_LIMIT,
        remaining: Math.max(
          0,
          REGISTERED_DAILY_LIMIT -
            usedToday
        ),
      });
    }, []);

  useEffect(() => {
    setAnonymousUsage(
      getUsage(anonymousPlan)
    );

    if (isLoggedIn) {
      refreshRegisteredUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const usage = isLoggedIn
    ? registeredUsage
    : anonymousUsage;

  function canGenerateNow(): boolean {
    if (isLoggedIn) {
      return true;
    }

    return canGenerate(anonymousPlan);
  }

  function recordAnonymousGeneration() {
    if (!isLoggedIn) {
      setAnonymousUsage(
        recordGeneration(anonymousPlan)
      );
    }
  }

  return {
    usage,
    canGenerateNow,
    recordAnonymousGeneration,
    refreshRegisteredUsage,
  };
}
