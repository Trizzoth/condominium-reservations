-- Historial/auditoría: quién aprobó, canceló o movió qué, con fecha.
-- Escritura solo vía service-role (helper fail-safe); lectura solo admin.
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL DEFAULT 'reservation',
  entity_id text NULL,
  detail text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins select audit" ON audit_log;
CREATE POLICY "Admins select audit" ON audit_log
FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
