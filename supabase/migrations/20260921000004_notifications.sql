-- Notificaciones in-app: campanita "tu reserva fue aprobada" sin depender del correo.
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','approved','rejected','reminder','checkin','cancelled')),
  reservation_id uuid NULL REFERENCES reservations(id) ON DELETE CASCADE,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own notifications" ON notifications;
CREATE POLICY "Users select own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
