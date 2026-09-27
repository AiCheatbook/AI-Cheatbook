-- ============================================
-- AI Cheatbook — Moderator role
-- ============================================
--
-- Run this once in Supabase SQL Editor. Safe to run again.
--
-- Roles (profiles.role):
--   user       — regular member.
--   moderator  — works in the admin area like an admin (creates and
--                edits news, learning cards, prompts, taxonomy,
--                moderation), but cannot delete anything and cannot
--                change Site Settings, Top 10, Users/roles or the
--                Audit Log.
--   admin      — everything.
--
-- What this does:
--   1. current_user_role(): the logged-in user's role, readable
--      inside policies without recursion.
--   2. Lets profiles.role hold 'moderator' (works whether the
--      column is text with a CHECK constraint or an enum).
--   3. Lets admins change other people's role / disabled status
--      (this is what the Users page needs to save), and stops
--      anyone who isn't an admin from changing a role, including
--      their own.
--   4. Gives moderators the same read/create/edit access as admins
--      on every table whose policies are admin-only (except
--      profiles and site_settings), plus delete on the "detail"
--      tables that editors rewrite when saving.
--   5. Blocks moderators from deleting (or soft-deleting via
--      deleted_at) the site's main content, even if some other
--      policy would allow it.

-- 1. Role helper -------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- 2. Allow the 'moderator' value --------------------------------

DO $$
DECLARE
  col_type text;
  enum_name text;
  c record;
  dropped boolean := false;
BEGIN
  SELECT data_type, udt_name INTO col_type, enum_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

  IF col_type = 'USER-DEFINED' THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', enum_name, 'moderator');
  ELSE
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%role%'
    LOOP
      EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', c.conname);
      dropped := true;
    END LOOP;

    IF dropped THEN
      ALTER TABLE profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('user', 'moderator', 'admin')) NOT VALID;
    END IF;
  END IF;
END $$;

-- 3. Admins manage roles; nobody else can change one -------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_admin_update'
  ) THEN
    CREATE POLICY "profiles_admin_update"
      ON profiles FOR UPDATE
      USING (public.current_user_role() = 'admin')
      WITH CHECK (public.current_user_role() = 'admin');
  END IF;
END $$;

GRANT UPDATE ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is null for the SQL Editor / service role.
  IF auth.uid() IS NOT NULL
     AND NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(public.current_user_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can change roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 4. Moderators get admin-level read/create/edit ----------------

DO $$
DECLARE
  t text;
  detail_tables text[] := ARRAY[
    'news_blocks',
    'learning_card_blocks',
    'learning_card_prompts',
    'library_item_keywords'
  ];
BEGIN
  FOR t IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename NOT IN ('profiles', 'site_settings')
      AND (coalesce(p.qual, '') ILIKE '%admin%'
           OR coalesce(p.with_check, '') ILIKE '%admin%')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_select') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (public.current_user_role() = ''moderator'')',
        t || '_moderator_select', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_insert') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (public.current_user_role() = ''moderator'')',
        t || '_moderator_insert', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_update') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (public.current_user_role() = ''moderator'') WITH CHECK (public.current_user_role() = ''moderator'')',
        t || '_moderator_update', t);
    END IF;
  END LOOP;

  -- Editors replace these rows when saving, so moderators need
  -- delete here to be able to edit.
  FOREACH t IN ARRAY detail_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_delete') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (public.current_user_role() = ''moderator'')',
        t || '_moderator_delete', t);
    END IF;
  END LOOP;
END $$;

-- 5. Moderators can never delete main content --------------------

DO $$
DECLARE
  t text;
  content_tables text[] := ARRAY[
    'news', 'learning_cards', 'library_items',
    'prompt_categories', 'prompt_subcategories', 'prompt_concepts',
    'library_keywords', 'prompt_structures', 'prompt_ratings',
    'comments', 'community_threads', 'community_replies',
    'community_polls', 'community_artwork', 'groups',
    'site_settings', 'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_no_delete') THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE USING (coalesce(public.current_user_role(), '''') <> ''moderator'')',
        t || '_moderator_no_delete', t);
    END IF;

    -- Soft delete (setting deleted_at) counts as deleting too.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'deleted_at'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_moderator_no_soft_delete'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I AS RESTRICTIVE FOR UPDATE USING (true) WITH CHECK (coalesce(public.current_user_role(), '''') <> ''moderator'' OR deleted_at IS NULL)',
        t || '_moderator_no_soft_delete', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
