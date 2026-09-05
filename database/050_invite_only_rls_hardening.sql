-- ============================================
-- AI Cheatbook — Community-First Platform
-- Hardening: real invite-only RLS on community_threads
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Background: 041_groups.sql disclosed that invite-only
-- group privacy was enforced only in the app layer,
-- because community_threads already had a broad,
-- unknown SELECT policy (the one that makes the public
-- homepage feed work for logged-out visitors) — and
-- Postgres RLS combines multiple permissive policies
-- with OR, so adding a stricter policy alongside it
-- would never actually narrow anything.
--
-- This migration finds and removes whatever SELECT
-- policy(ies) currently exist on community_threads,
-- then installs ONE policy that correctly covers every
-- case:
--   - group_id IS NULL (main/official feed)   → public
--   - group_id → a PUBLIC community            → public
--   - group_id → an INVITE-ONLY community      → owner
--     or active members only
--
-- IMPORTANT — read before running:
-- This assumes the only thing the old policy did was
-- "make every row publicly readable" (which matches the
-- observed behavior: logged-out visitors can browse the
-- main feed). If your old policy also encoded some OTHER
-- condition this migration doesn't know about, that
-- condition is lost after this runs — the app already
-- separately filters is_hidden/deleted_at at the query
-- level (see app/page.tsx and others), so hidden/deleted
-- threads were never reachable via the app regardless of
-- RLS, but if you added anything beyond that, re-check
-- after running this.
--
-- Test after running: confirm (a) the public homepage
-- feed still loads for a logged-out visitor, (b) a
-- non-member genuinely cannot fetch an invite-only
-- community's threads directly, (c) an active member of
-- that community still can.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'community_threads' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON community_threads', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "community_threads_select_scoped"
  ON community_threads FOR SELECT
  USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = community_threads.group_id
        AND g.visibility = 'public'
    )
    OR auth.uid() IN (
      SELECT owner_id FROM groups WHERE groups.id = community_threads.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = community_threads.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- GRANT was presumably already in place (the app already
-- reads this table), but re-asserting is harmless and
-- makes this migration self-contained.
GRANT SELECT ON community_threads TO anon, authenticated;

-- community_polls has the identical gap (group_id added in
-- 046_polls_in_communities.sql, same unknown broad SELECT
-- policy underneath it) — same fix, same reasoning.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'community_polls' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON community_polls', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "community_polls_select_scoped"
  ON community_polls FOR SELECT
  USING (
    group_id IS NULL
    OR EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = community_polls.group_id
        AND g.visibility = 'public'
    )
    OR auth.uid() IN (
      SELECT owner_id FROM groups WHERE groups.id = community_polls.group_id
    )
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = community_polls.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

GRANT SELECT ON community_polls TO anon, authenticated;

