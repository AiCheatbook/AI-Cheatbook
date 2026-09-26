-- ============================================
-- AI Cheatbook — Prompt Style Pages
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Adds the extra details used by the redesigned Prompt Gallery
-- ("Prompt Style Page") Learning Cards, and lets admins edit a
-- gallery after it is created.
--
-- 1. learning_cards.gallery_settings (jsonb)
--    Page-level design details: headline accent words, hero
--    stats, library section heading/text, prompt box label and
--    the featured item. Shape (all keys optional):
--    {
--      "headlineAccent": "differently.",
--      "stats": [{ "value": "35", "label": "Styles" }],
--      "libraryEyebrow": "The style library",
--      "libraryHeading": "Compare, inspect or copy.",
--      "libraryText": "…",
--      "promptLabel": "Reusable prompt · OpenArt GPT Image 2",
--      "featuredIndex": 0
--    }
--
-- 2. learning_card_prompts.item_details (jsonb)
--    Per-item extras: { "description": "…", "featured": true }
--
-- 3. Admin UPDATE/DELETE policies on learning_card_prompts, so
--    the gallery editor can re-save a gallery's items. They are
--    only added when RLS is enabled on the table and no policy
--    with the same name exists, so running this twice is safe.

ALTER TABLE learning_cards
  ADD COLUMN IF NOT EXISTS gallery_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE learning_card_prompts
  ADD COLUMN IF NOT EXISTS item_details jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'learning_card_prompts' AND relrowsecurity
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'learning_card_prompts'
        AND policyname = 'learning_card_prompts_admin_update'
    ) THEN
      CREATE POLICY "learning_card_prompts_admin_update"
        ON learning_card_prompts FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'learning_card_prompts'
        AND policyname = 'learning_card_prompts_admin_delete'
    ) THEN
      CREATE POLICY "learning_card_prompts_admin_delete"
        ON learning_card_prompts FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

GRANT UPDATE, DELETE ON learning_card_prompts TO authenticated;
