import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type NotificationType =
  | "reply"
  | "answer_accepted"
  | "featured_in_library";

type CreateNotificationParams = {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  message: string;
  link: string;
};

/*
 * Never lets a notification failure break
 * the actual action that triggered it (e.g.
 * posting a reply should still succeed even
 * if the notification insert fails for some
 * reason) — errors are logged, not thrown.
 * Also skips notifying someone about their
 * own action (no "you replied to your own
 * post" notification).
 */

export async function createNotification({
  userId,
  actorId,
  type,
  message,
  link,
}: CreateNotificationParams) {
  if (actorId && actorId === userId) {
    return;
  }

  try {
    const { error } =
      await supabaseAuthClient
        .from("notifications")
        .insert({
          user_id: userId,
          actor_id: actorId,
          type,
          message,
          link,
        });

    if (error) {
      console.error(
        "Failed to create notification:",
        error.message
      );
    }
  } catch (err) {
    console.error(
      "Failed to create notification:",
      err
    );
  }
}
