-- Configuración global editable desde el panel (sin tocar código).
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read settings" ON app_settings;
CREATE POLICY "Authenticated read settings" ON app_settings
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins write settings" ON app_settings;
CREATE POLICY "Admins write settings" ON app_settings
FOR ALL USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

INSERT INTO app_settings (key, value) VALUES
  ('cancel_window_hours', '2'),
  ('min_advance_minutes', '30')
ON CONFLICT (key) DO NOTHING;
