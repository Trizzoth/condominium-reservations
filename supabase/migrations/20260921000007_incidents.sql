-- Incidencias: reporte de daños con foto (Storage, $0 extra en plan free).
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  common_area_id uuid NULL REFERENCES common_areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NULL,
  photo_url text NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own incidents" ON incidents;
CREATE POLICY "Users insert own incidents" ON incidents
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users select own incidents" ON incidents;
CREATE POLICY "Users select own incidents" ON incidents
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins select incidents" ON incidents;
CREATE POLICY "Admins select incidents" ON incidents
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins update incidents" ON incidents;
CREATE POLICY "Admins update incidents" ON incidents
FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, created_at DESC);

-- Bucket público de lectura (fotos de daños en áreas comunes, baja sensibilidad):
-- subir solo autenticados, leer cualquiera con el link (evita signed URLs en MVP).
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidencias', 'incidencias', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated upload incidencias" ON storage.objects;
CREATE POLICY "Authenticated upload incidencias" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incidencias');

DROP POLICY IF EXISTS "Public read incidencias" ON storage.objects;
CREATE POLICY "Public read incidencias" ON storage.objects
FOR SELECT USING (bucket_id = 'incidencias');
