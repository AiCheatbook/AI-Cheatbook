-- ============================================
-- AI Cheatbook — Notifications
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Scoped to the highest-signal events first
-- (someone engaged with YOUR content), not
-- every possible interaction — avoids a
-- noisy, low-value notification feed.

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES profiles (id)
    ON DELETE CASCADE,

  actor_id uuid
    REFERENCES profiles (id)
    ON DELETE SET NULL,

  type text NOT NULL
    CHECK (
      type IN (
        'reply',
        'answer_accepted',
        'featured_in_library'
      )
    ),

  message text NOT NULL,

  link text NOT NULL,

  is_read boolean
    NOT NULL DEFAULT false,

  created_at timestamptz
    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  notifications_user_id_idx
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  "Users can read their own notifications"
  ON notifications;
CREATE POLICY
  "Users can read their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS
  "Users can mark their own notifications read"
  ON notifications;
CREATE POLICY
  "Users can mark their own notifications read"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS
  "Authenticated users can create notifications"
  ON notifications;
CREATE POLICY
  "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE
  ON public.notifications
  TO authenticated;

GRANT ALL ON public.notifications
  TO service_role;

NOTIFY pgrst, 'reload schema';
