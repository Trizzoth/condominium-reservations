"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const roleSchema = z.enum(["resident", "admin", "security"]);
const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: roleSchema,
  fullName: z.string().max(100).optional(),
});

/** Solo admin. Los layouts ya lo validan; esto es defensa en profundidad. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "No autorizado" as const };
  return { adminId: user.id };
}

export async function inviteUser(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const validated = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    fullName: formData.get("fullName") || undefined,
  });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: validated.data.email,
    email_confirm: true,
    user_metadata: {
      full_name: validated.data.fullName || "",
      role: validated.data.role,
    },
  });

  if (error || !data.user) {
    return { error: error?.message || "No se pudo crear el usuario" };
  }

  // El trigger handle_new_user debería crear el profile; lo aseguramos.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: validated.data.fullName || "",
    role: validated.data.role,
    updated_at: new Date().toISOString(),
  });
  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin/users");
  return { success: `Usuario ${validated.data.email} creado como ${validated.data.role}` };
}

export async function updateUserRole(userId: string, role: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { error: "Rol inválido" };
  if (userId === auth.adminId) {
    return { error: "No puedes cambiar tu propio rol (evita bloquearte)" };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: parsedRole.data, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };

  // Metadata en auth para que JWT futuros traigan el rol correcto.
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: parsedRole.data },
  });
  if (authError) return { error: authError.message };

  revalidatePath("/admin/users");
  return { success: "Rol actualizado" };
}

export async function deleteUser(userId: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  if (userId === auth.adminId) {
    return { error: "No puedes eliminar tu propia cuenta" };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) return { error: profileError.message };

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { error: authError.message };

  revalidatePath("/admin/users");
  return { success: "Usuario eliminado" };
}

const cancelSchema = z.object({
  reservationId: z.string().uuid("Reserva inválida"),
  motivo: z.string().max(280).optional(),
});

/** A6: el admin cancela la reserva de cualquier usuario indicando motivo. */
export async function adminCancelReservation(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const validated = cancelSchema.safeParse({
    reservationId: formData.get("reservationId"),
    motivo: formData.get("motivo") || undefined,
  });
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const admin = createAdminClient();
  const { data: reservation, error: fetchError } = await admin
    .from("reservations")
    .select("id, status")
    .eq("id", validated.data.reservationId)
    .single();
  if (fetchError || !reservation) return { error: "Reserva no encontrada" };
  if (reservation.status !== "pending" && reservation.status !== "approved") {
    return { error: "Solo se pueden cancelar reservas pendientes o aprobadas" };
  }

  const { error } = await admin
    .from("reservations")
    .update({
      status: "cancelled",
      admin_notes: validated.data.motivo || "Cancelada por administración",
      updated_at: new Date().toISOString(),
    })
    .eq("id", validated.data.reservationId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  return { success: "Reserva cancelada" };
}
