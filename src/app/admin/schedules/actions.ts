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

const scheduleSchema = z.object({
  common_area_id: z.string().uuid(),
  day_of_week: z.coerce.number().int().min(0).max(6),
  open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  max_duration_hours: z.coerce.number().int().min(1).max(24),
});

/** Crear o actualizar horario (service-role: JWT sin claim admin, ver #61). */
export async function saveSchedule(formData: FormData) {
  const ok = await requireAdmin();
  if (!ok) return { error: "No autorizado" };
  const validated = scheduleSchema.safeParse({
    common_area_id: formData.get("common_area_id"),
    day_of_week: formData.get("day_of_week"),
    open_time: formData.get("open_time"),
    close_time: formData.get("close_time"),
    max_duration_hours: formData.get("max_duration_hours"),
  });
  if (!validated.success) return { error: "Datos inválidos: revisa los campos" };
  if (validated.data.open_time >= validated.data.close_time) {
    return { error: "La apertura debe ser anterior al cierre" };
  }

  const adminDb = createAdminClient();
  const id = formData.get("id");
  const payload = { ...validated.data, updated_at: new Date().toISOString() };
  const { error } =
    typeof id === "string" && id
      ? await adminDb.from("availability_schedules").update(payload).eq("id", id)
      : await adminDb.from("availability_schedules").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedules");
  revalidatePath("/dashboard/reservations/new");
  return { success: "Horario guardado" };
}

export async function deleteScheduleAction(scheduleId: string) {
  const ok = await requireAdmin();
  if (!ok) return { error: "No autorizado" };
  const { error } = await createAdminClient()
    .from("availability_schedules")
    .delete()
    .eq("id", scheduleId);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedules");
  revalidatePath("/dashboard/reservations/new");
  return { success: "Horario eliminado" };
}
