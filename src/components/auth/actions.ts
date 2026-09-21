"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rol del usuario actual, leído con service-role (confiable).
 * Para el cambio de cuenta: el cliente recién hizo setSession y la
 * lectura por RLS a veces llega antes de que la cookie aplique.
 */
export async function myRoleAction(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role ?? null;
}
