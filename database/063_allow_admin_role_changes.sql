-- ============================================
-- AI Cheatbook — Let admins change roles
-- ============================================
--
-- Run this once in Supabase SQL Editor. Safe to run again.
--
-- The existing prevent_self_role_escalation trigger on profiles
-- quietly reset the role back whenever any logged-in user changed
-- one, admins included, so the Users page could never save a new
-- role. Keep blocking regular users and moderators, but let
-- admins through.

CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() = 'authenticated'
     AND coalesce(
       (SELECT p.role::text FROM profiles p WHERE p.id = auth.uid()),
       ''
     ) <> 'admin' THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$function$;
