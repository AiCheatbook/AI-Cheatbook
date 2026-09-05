import { supabaseAuthClient } from "@/lib/supabase/auth-client";

// v1 point values — creating a post is the only awarded
// action right now (see database/047_gamification_points.sql
// for why replies/likes/poll-votes aren't included yet).
export const POINTS_FOR_POST = 5;

// Extended values — replies, receiving a like, and casting a
// poll vote, all scoped to whichever community the thread/poll
// itself belongs to (group_id null means main feed, no points).
export const POINTS_FOR_REPLY = 2;
export const POINTS_FOR_RECEIVING_LIKE = 1;
export const POINTS_FOR_POLL_VOTE = 1;

/*
 * Awards points to a user within one specific community.
 * Read-then-write, same pattern (and same disclosed
 * limitation) as syncMemberCount elsewhere in the Groups
 * code — not perfectly atomic under concurrent awards to
 * the same member, but fine at this scale. A real fix
 * would be a Postgres RPC that increments server-side in
 * one statement; noted here for later, not built now.
 */
export async function awardCommunityPoints(
  groupId: string,
  userId: string,
  amount: number
): Promise<void> {
  const { data: member, error: fetchError } = await supabaseAuthClient
    .from("group_members")
    .select("id, points")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error(
      "awardCommunityPoints: failed to look up member:",
      fetchError.message
    );
    return;
  }

  // Not a member of this community (e.g. the owner posting
  // in their own group before ever joining as a member row)
  // — nothing to award points to.
  if (!member) {
    return;
  }

  const { error: updateError } = await supabaseAuthClient
    .from("group_members")
    .update({ points: (member.points || 0) + amount })
    .eq("id", member.id);

  if (updateError) {
    console.error(
      "awardCommunityPoints: failed to update points:",
      updateError.message
    );
  }
}
