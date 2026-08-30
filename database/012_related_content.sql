-- ============================================
-- AI Cheatbook — Cross-content related links
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Lets an admin manually pick related News
-- articles, Prompts, and Learning Cards to
-- show on any of the three, regardless of
-- type. Stored as a simple JSON list so no
-- new join tables are needed.
--
-- Format: [{ "type": "news" | "prompt" | "learning_card",
--            "id": "uuid", "slug": "...", "title": "..." }]

ALTER TABLE news
  ADD COLUMN IF NOT EXISTS related_content jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE library_items
  ADD COLUMN IF NOT EXISTS related_content jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE learning_cards
  ADD COLUMN IF NOT EXISTS related_content jsonb NOT NULL DEFAULT '[]'::jsonb;
