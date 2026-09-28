-- ============================================
-- AI Cheatbook — Prompt Style Page
-- Per-field visibility ("dim this field") for
-- the admin Prompt New/Edit forms
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- Adds disabled_fields to library_items: an
-- array of field keys (e.g. "media", "seo",
-- "aiTools") that a moderator has dimmed on
-- that specific prompt's edit form. This is
-- purely a per-prompt UI convenience — it does
-- not hide anything on the public prompt page,
-- and dimming a field never clears its saved
-- value, it only keeps it out of the way while
-- editing. Existing rows default to an empty
-- array (nothing dimmed).

alter table public.library_items
  add column if not exists disabled_fields jsonb not null default '[]'::jsonb;

comment on column public.library_items.disabled_fields is
  'Array of field keys dimmed on this prompt''s admin edit form (UI-only, does not affect the public page).';
