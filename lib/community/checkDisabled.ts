import { supabaseAuthClient } from "@/lib/supabase/auth-client";

/*
 * Checks profiles.is_disabled for one user. Used to gate actions
 * beyond the two originally covered (posting, joining a
 * community) — see database/042_user_management.sql for the
 * original disclosed scope. This is called from each additional
 * action point as coverage is extended, rather than centrally
 * enforced (still app-layer, not RLS — same disclosed limitation
 * as before: a sophisticated user hitting the API directly could
 * still bypass this).
 */
export async function isUserDisabled(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAuthClient
    .from("profiles")
    .select("is_disabled")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("isUserDisabled: failed to check status:", error.message);
    return false; // fail open — a check failure shouldn't lock someone out
  }

  return Boolean(data?.is_disabled);
}
