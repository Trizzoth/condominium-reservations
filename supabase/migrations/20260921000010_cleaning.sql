-- Tareas de limpieza para el conserje (rol security, sin nuevo rol en la BD).
-- El admin crea/asigna; seguridad ve sus pendientes y marca hecho.
-- Al crear se avisa por campanita a todos los usuarios security.
CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_area_id uuid NULL REFERENCES common_areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  created_by uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins select cleaning" ON cleaning_tasks;
CREATE POLICY "Admins select cleaning" ON cleaning_tasks
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins insert cleaning" ON cleaning_tasks;
CREATE POLICY "Admins insert cleaning" ON cleaning_tasks
FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins update cleaning" ON cleaning_tasks;
CREATE POLICY "Admins update cleaning" ON cleaning_tasks
FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins delete cleaning" ON cleaning_tasks;
CREATE POLICY "Admins delete cleaning" ON cleaning_tasks
FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- Seguridad (conserje): ver pendientes y marcar hecho.
DROP POLICY IF EXISTS "Security select cleaning" ON cleaning_tasks;
CREATE POLICY "Security select cleaning" ON cleaning_tasks
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security','admin'))
);
DROP POLICY IF EXISTS "Security update cleaning" ON cleaning_tasks;
CREATE POLICY "Security update cleaning" ON cleaning_tasks
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security','admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('security','admin'))
);

CREATE INDEX IF NOT EXISTS idx_cleaning_status ON cleaning_tasks(status, created_at DESC);
