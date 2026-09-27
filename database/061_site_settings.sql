-- ============================================
-- AI Cheatbook — Site Settings
-- ============================================
--
-- Run this once in Supabase SQL Editor.
--
-- One row (id = 'global') holding site-wide settings edited at
-- /admin/settings: website icon (favicon), header logo, and which
-- menu tabs / header button are switched on. Shape (all keys
-- optional):
--   {
--     "faviconUrl": "https://…/icon.png",
--     "logoUrl": "https://…/logo.png",
--     "hiddenNav": ["generator", "notebook"],
--     "showCreateCommunity": true
--   }
--
-- Everyone can read it (the header needs it); only admins can
-- change it.

CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_settings'
      AND policyname = 'site_settings_public_read'
  ) THEN
    CREATE POLICY "site_settings_public_read"
      ON site_settings FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_settings'
      AND policyname = 'site_settings_admin_write'
  ) THEN
    CREATE POLICY "site_settings_admin_write"
      ON site_settings FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

GRANT SELECT ON site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON site_settings TO authenticated;

INSERT INTO site_settings (id) VALUES ('global')
  ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
