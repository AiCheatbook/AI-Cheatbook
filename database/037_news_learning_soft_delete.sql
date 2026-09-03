-- ============================================
-- AI Cheatbook — Community-First Platform
-- Round 2 supplement: soft-delete on News
-- and Learning Cards specifically
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Round 1 (036) added deleted_at to
-- library_items — but news and learning_cards
-- are SEPARATE tables, not part of
-- library_items. The new unified feed query
-- layer queries deleted_at on both, so this
-- must run before deploying that code, or
-- every news/learning feed query will error
-- (same class of mistake as the earlier
-- discussion-detail 404 regression this
-- session — catching it before shipping this
-- time instead of after).

ALTER TABLE news
  ADD COLUMN IF NOT EXISTS deleted_at
    timestamptz;

CREATE INDEX IF NOT EXISTS
  news_deleted_at_idx
  ON news (deleted_at);

ALTER TABLE learning_cards
  ADD COLUMN IF NOT EXISTS deleted_at
    timestamptz;

CREATE INDEX IF NOT EXISTS
  learning_cards_deleted_at_idx
  ON learning_cards (deleted_at);

NOTIFY pgrst, 'reload schema';
