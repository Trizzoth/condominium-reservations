import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/**
 * Inserta una notificación in-app vía service-role.
 * Fail-safe a propósito: si falla, solo loguea (nunca tumba la acción
 * principal como aprobar/crear, igual que los emails).
 */
export async function notifyUser(input: Omit<NotificationInsert, "id" | "created_at">) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert(input);
  } catch (err) {
    console.error("notifyUser failed:", err);
  }
}

export function reservationApprovedNotification(input: {
  userId: string;
  areaName: string;
  when: string;
  reservationId: string;
}) {
  return notifyUser({
    user_id: input.userId,
    title: "Tu reserva fue aprobada",
    body: `${input.areaName} · ${input.when}`,
    type: "approved",
    reservation_id: input.reservationId,
  });
}

export function reservationRejectedNotification(input: {
  userId: string;
  areaName: string;
  when: string;
  reservationId: string;
}) {
  return notifyUser({
    user_id: input.userId,
    title: "Tu reserva fue rechazada",
    body: `${input.areaName} · ${input.when}`,
    type: "rejected",
    reservation_id: input.reservationId,
  });
}

export function reservationCreatedNotification(input: {
  userId: string;
  areaName: string;
  when: string;
  reservationId: string;
}) {
  return notifyUser({
    user_id: input.userId,
    title: "Reserva recibida",
    body: `${input.areaName} · ${input.when} · pendiente de aprobación`,
    type: "info",
    reservation_id: input.reservationId,
  });
}
