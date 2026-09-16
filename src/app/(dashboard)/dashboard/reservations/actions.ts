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

  // Business validations
  const start = new Date(validated.data.startTime);
  const end = new Date(validated.data.endTime);
  const now = new Date();

  // 1. Anticipación mínima 2 horas
  if (start.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    return { error: { form: ["La reserva debe hacerse con al menos 2 horas de anticipación"] } };
  }

  // 2. Anticipación máxima 30 días
  if (start.getTime() - now.getTime() > 30 * 24 * 60 * 60 * 1000) {
    return { error: { form: ["No se pueden reservar con más de 30 días de anticipación"] } };
  }

  // 3. Duración máxima 4 horas (se validará contra el horario del área)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours > 4) {
    return { error: { form: ["La duración máxima por reserva es 4 horas"] } };
  }

  // 4. Max 2 reservas activas por semana por usuario
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() - start.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

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

  if (userReservationsThisWeek && userReservationsThisWeek.length >= 2) {
    return { error: { form: ["Máximo 2 reservas por semana permitidas"] } };
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

  // 6. Check area schedule (optional - verify it's within allowed hours)
  const { data: schedule } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("common_area_id", validated.data.commonAreaId)
    .eq("day_of_week", start.getDay())
    .single();

  if (schedule) {
    const startTimeStr = format(start, "HH:mm");
    const endTimeStr = format(end, "HH:mm");
    if (startTimeStr < schedule.open_time || endTimeStr > schedule.close_time) {
      return {
        error: {
          form: [`Horario fuera del permitido (${schedule.open_time} - ${schedule.close_time})`],
        },
      };
    }
    if (durationHours > schedule.max_duration_hours) {
      return {
        error: { form: [`Duración máxima para esta área: ${schedule.max_duration_hours} horas`] },
      };
    }
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

  return { success: "Reserva aprobada" };
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
        userName: reservation.profiles.full_name || "Residente",
        areaName: reservation.common_areas?.name || "Área común",
        startTime: startFormatted,
        endTime: endFormatted,
        adminNotes: adminNotes || undefined,
      }),
    });
  }

  return { success: "Reserva rechazada" };
}

export async function cancelReservationAction(reservationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  return { success: "Reserva cancelada" };
}
