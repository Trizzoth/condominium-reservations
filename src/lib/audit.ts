import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'reservation.created'
  | 'reservation.approved'
  | 'reservation.rejected'
  | 'reservation.cancelled'
  | 'reservation.admin_cancelled'
  | 'reservation.checked_in'
  | 'reservation.checked_out'
  | 'reservation.no_show';

/**
 * Registra un evento en audit_log vía service-role.
 * Fail-safe: si falla, solo loguea (nunca tumba la acción principal).
 * actorId null = sistema (ej. cron automático).
 */
export async function logAudit(input: {
  actorId: string | null;
  action: AuditAction;
  entityId: string;
  detail?: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      actor_id: input.actorId,
      action: input.action,
      entity: 'reservation',
      entity_id: input.entityId,
      detail: input.detail || null,
    });
  } catch (err) {
    console.error('logAudit failed:', err);
  }
}
