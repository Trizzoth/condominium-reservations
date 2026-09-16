import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service-role key (bypass RLS).
 *
 * SOLO para uso en servidor (Route Handlers, Server Actions, cron).
 * Nunca importar desde Client Components: expondría la service-role key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resuelve emails de Auth por user id.
 * Necesario porque `profiles` NO tiene columna `email`
 * (el email vive solo en `auth.users`, legible únicamente con service-role).
 * Hace una sola llamada (paginada a 100, suficiente para el MVP).
 */
export async function getUserEmailsByIds(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error || !data) return map;

  for (const u of data.users) {
    if (u.email && unique.includes(u.id)) map.set(u.id, u.email);
  }
  return map;
}
