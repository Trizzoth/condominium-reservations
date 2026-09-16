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
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
