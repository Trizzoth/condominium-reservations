"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserEmailsByIds } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  sendEmail,
  reservationCreatedEmail,
  reservationApprovedEmail,
  reservationRejectedEmail,
} from "@/lib/emails";
import QRCode from "qrcode";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek } from "date-fns";
import { BUSINESS_TIMEZONE, OPEN_HOUR, CLOSE_HOUR } from "@/lib/reservation-rules";

const reservationSchema = z.object({
  commonAreaId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export async function createReservation(formData: FormData) {
  const validated = reservationSchema.safeParse({
    commonAreaId: formData.get("commonAreaId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { form: ["No autenticado"] } };
  }

  // Validaciones de negocio (reto-hackaton-reservas.pdf RN-02..RN-06, RN-09).
  // Todas en servidor; el cliente solo sugiere horarios.
  const start = new Date(validated.data.startTime);
  const end = new Date(validated.data.endTime);
  const now = new Date();

  if (!(start < end)) {
    return { error: { form: ["El fin debe ser posterior al inicio"] } };
  }

  // RN-02: bloques de 30 minutos (los minutos no dependen de zona horaria).
  if (start.getUTCMinutes() % 30 !== 0 || end.getUTCMinutes() % 30 !== 0) {
    return { error: { form: ["Las reservas son en bloques de 30 minutos (ej. 07:00, 07:30)"] } };
  }

  // RN-05: no pasado, mínimo 30 minutos de anticipación.
  if (start.getTime() - now.getTime() < 30 * 60 * 1000) {
    return { error: { form: ["La reserva debe hacerse con al menos 30 minutos de anticipación"] } };
  }

  // RN-03 (decisión David): duración mínima 3 horas, máxima 6 horas.
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours < 3 || durationHours > 6) {
    return { error: { form: ["La duración por reserva es de 3 a 6 horas"] } };
  }

  // Horario 06:00–24:00 America/Costa_Rica ("00:00" = medianoche exacta = 24:00).
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const startCr = formatInTimeZone(start, BUSINESS_TIMEZONE, "HH:mm");
  const endCrRaw = formatInTimeZone(end, BUSINESS_TIMEZONE, "HH:mm");
  const sMin = toMin(startCr);
  const eMin = endCrRaw === "00:00" ? 1440 : toMin(endCrRaw);
  if (sMin < toMin(OPEN_HOUR) || eMin <= sMin || eMin > toMin(CLOSE_HOUR)) {
    return { error: { form: [`Horario de operación ${OPEN_HOUR} - ${CLOSE_HOUR}`] } };
  }

  // RN-06: máximo 3 activas por semana (domingo a sábado, ver D1).
  const crNow = toZonedTime(now, BUSINESS_TIMEZONE);
  const weekStart = fromZonedTime(startOfWeek(crNow), BUSINESS_TIMEZONE);
  const weekEnd = fromZonedTime(endOfWeek(crNow), BUSINESS_TIMEZONE);

  const { data: userReservationsThisWeek, error: weekError } = await supabase
    .from("reservations")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString());

  if (weekError) {
    return { error: { form: [weekError.message] } };
  }

  if (userReservationsThisWeek && userReservationsThisWeek.length >= 3) {
    return { error: { form: ["Máximo 3 reservas por semana permitidas"] } };
  }

  // 5. Check availability (no overlap)
  const { data: overlapping, error: overlapError } = await supabase
    .from("reservations")
    .select("id")
    .eq("common_area_id", validated.data.commonAreaId)
    .in("status", ["pending", "approved"])
    .lt("start_time", validated.data.endTime)
    .gt("end_time", validated.data.startTime);

  if (overlapError) {
    return { error: { form: [overlapError.message] } };
  }

  if (overlapping && overlapping.length > 0) {
    return { error: { form: ["Ese horario ya está reservado. Elige otro."] } };
  }

  // 6. RN-09: el área debe existir y estar activa (también en servidor,
  // para que no se pueda saltear por API directa).
  const { data: area } = await supabase
    .from("common_areas")
    .select("id, is_active")
    .eq("id", validated.data.commonAreaId)
    .single();

  if (!area || !area.is_active) {
    return { error: { form: ["Esa área no está disponible"] } };
  }

  // Create reservation
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      common_area_id: validated.data.commonAreaId,
      start_time: validated.data.startTime,
      end_time: validated.data.endTime,
      status: "pending",
    })
    .select("*, common_areas(name)")
    .single();

  if (error) {
    // Check if it's the exclusion constraint violation
    if (error.code === "23P01") {
      return { error: { form: ["Ese horario ya está reservado (conflicto en BD)"] } };
    }
    return { error: { form: [error.message] } };
  }

  // Send confirmation email (el email vive en auth.users, no en profiles)
  if (reservation) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (user.email) {
      const startFormatted = format(
        parseISO(reservation.start_time),
        "d 'de' MMMM yyyy 'a las' HH:mm",
        { locale: es },
      );
      const endFormatted = format(parseISO(reservation.end_time), "HH:mm", { locale: es });

      await sendEmail({
        to: user.email,
        subject: "✅ Reserva recibida - Pendiente de aprobación",
        html: reservationCreatedEmail({
          userName: profile?.full_name || "Residente",
          areaName: reservation.common_areas?.name || "Área común",
          startTime: `${startFormatted}`,
          endTime: endFormatted,
          reservationId: reservation.id.slice(0, 8),
        }),
      });
    }
  }

  return {
    success: "Reserva enviada. Espera aprobación del admin.",
    reservationId: reservation?.id,
  };
}

export async function approveReservationAction(reservationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "No autorizado" };

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .select("*, common_areas(name), profiles(full_name)")
    .single();

  if (error) return { error: error.message };

  // Send approval email (el email vive en auth.users, no en profiles)
  const emails = await getUserEmailsByIds([reservation.user_id]);
  const recipientEmail = emails.get(reservation.user_id);
  if (recipientEmail) {
    const startFormatted = format(
      parseISO(reservation.start_time),
      "d 'de' MMMM yyyy 'a las' HH:mm",
      { locale: es },
    );
    const endFormatted = format(parseISO(reservation.end_time), "HH:mm", { locale: es });

    // QR con el id para check-in en seguridad (si falla, el email va sin QR).
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(reservation.id, { width: 160, margin: 1 });
    } catch (err) {
      console.error("QR generation failed:", err);
    }

    await sendEmail({
      to: recipientEmail,
      subject: "✅ Tu reserva ha sido aprobada",
      html: reservationApprovedEmail({
        userName: reservation.profiles?.full_name || "Residente",
        areaName: reservation.common_areas?.name || "Área común",
        startTime: startFormatted,
        endTime: endFormatted,
        adminNotes: reservation.admin_notes || undefined,
        qrCodeDataUrl,
      }),
    });
  }

  revalidateAdmin();
  return { success: "Reserva aprobada" };
}

async function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/reservations");
}

export async function rejectReservationAction(reservationId: string, adminNotes?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "No autorizado" };

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "rejected",
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .select("*, common_areas(name), profiles(full_name)")
    .single();

  if (error) return { error: error.message };

  // Send rejection email (el email vive en auth.users, no en profiles)
  const emails = await getUserEmailsByIds([reservation.user_id]);
  const recipientEmail = emails.get(reservation.user_id);
  if (recipientEmail) {
    const startFormatted = format(
      parseISO(reservation.start_time),
      "d 'de' MMMM yyyy 'a las' HH:mm",
      { locale: es },
    );
    const endFormatted = format(parseISO(reservation.end_time), "HH:mm", { locale: es });

    await sendEmail({
      to: recipientEmail,
      subject: "❌ Tu reserva ha sido rechazada",
      html: reservationRejectedEmail({
        userName: reservation.profiles?.full_name || "Residente",
        areaName: reservation.common_areas?.name || "Área común",
        startTime: startFormatted,
        endTime: endFormatted,
        adminNotes: adminNotes || undefined,
      }),
    });
  }

  revalidateAdmin();
  return { success: "Reserva rechazada" };
}
