import { createAdminClient } from '@/lib/supabase/admin';

export interface AppSettings {
  /** Horas mínimas antes del inicio para poder cancelar (RN-07). */
  cancelWindowHours: number;
  /** Minutos mínimos de anticipación para reservar (RN-05). */
  minAdvanceMinutes: number;
}

const DEFAULTS: AppSettings = {
  cancelWindowHours: 2,
  minAdvanceMinutes: 30,
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Lee la configuración global (service-role, solo servidor).
 * Si la tabla/fila falta, cae a los valores históricos sin romper nada.
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('app_settings').select('key, value');
    if (error || !data) return DEFAULTS;
    const map = new Map(data.map((r) => [r.key, r.value]));
    return {
      cancelWindowHours: parsePositiveInt(map.get('cancel_window_hours'), DEFAULTS.cancelWindowHours),
      minAdvanceMinutes: parsePositiveInt(map.get('min_advance_minutes'), DEFAULTS.minAdvanceMinutes),
    };
  } catch {
    return DEFAULTS;
  }
}
