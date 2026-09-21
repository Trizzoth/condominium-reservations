"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return true;
}

const areaSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  capacity: z.coerce.number().int().min(1).max(1000),
  rules: z.string().max(1000).optional(),
  // El Select manda "true"/"false" (z.coerce.boolean("false") sería true).
  is_active: z.enum(["true", "false"]).transform((v) => v === "true"),
  min_duration_hours: z.coerce.number().int().min(1).max(24),
  max_duration_hours: z.coerce.number().int().min(1).max(24),
  open_hour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close_hour: z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/),
  max_per_week: z.coerce.number().int().min(1).max(20),
});

/** Crear o actualizar área (service-role: el JWT no trae claim admin). */
export async function saveArea(formData: FormData) {
  const ok = await requireAdmin();
  if (!ok) return { error: "No autorizado" };
  const validated = areaSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    capacity: formData.get("capacity"),
    rules: formData.get("rules") || undefined,
    is_active: formData.get("is_active"),
    min_duration_hours: formData.get("min_duration_hours"),
    max_duration_hours: formData.get("max_duration_hours"),
    open_hour: formData.get("open_hour"),
    close_hour: formData.get("close_hour"),
    max_per_week: formData.get("max_per_week"),
  });
  if (!validated.success) {
    return { error: "Datos inválidos: revisa los campos" };
  }
  if (validated.data.max_duration_hours < validated.data.min_duration_hours) {
    return { error: "La duración máxima no puede ser menor que la mínima" };
  }

  const id = formData.get("id");
  const adminDb = createAdminClient();
  const payload = {
    ...validated.data,
    description: validated.data.description || null,
    rules: validated.data.rules || null,
    updated_at: new Date().toISOString(),
  };
  const { error } =
    typeof id === "string" && id
      ? await adminDb.from("common_areas").update(payload).eq("id", id)
      : await adminDb.from("common_areas").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/areas");
  revalidatePath("/dashboard/reservations/new");
  return { success: "Área guardada" };
}

/** A4: las áreas no se borran, se desactivan (bloqueado si hay futuras aprobadas). */
export async function toggleAreaActive(areaId: string) {
  const ok = await requireAdmin();
  if (!ok) return { error: "No autorizado" };
  const adminDb = createAdminClient();
  const { data: area } = await adminDb
    .from("common_areas")
    .select("id, is_active")
    .eq("id", areaId)
    .single();
  if (!area) return { error: "Área no encontrada" };

  if (area.is_active) {
    const { count } = await adminDb
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("common_area_id", areaId)
      .eq("status", "approved")
      .gte("start_time", new Date().toISOString());
    if (count && count > 0) {
      return {
        error: `No se puede desactivar: tiene ${count} reserva(s) futura(s) aprobada(s). Cancélalas primero.`,
      };
    }
  }

  const { error } = await adminDb
    .from("common_areas")
    .update({ is_active: !area.is_active, updated_at: new Date().toISOString() })
    .eq("id", areaId);
  if (error) return { error: error.message };
  revalidatePath("/admin/areas");
  return { success: area.is_active ? "Área desactivada" : "Área activada" };
}
