"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserEmailsByIds } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  sendEmail,
  reservationCreatedEmail,
  reservationApprovedEmail,
  reservationRejectedEmail,
  reservationRecurringEmail,
} from "@/lib/emails";
import QRCode from "qrcode";
import {
  notifyUser,
  reservationApprovedNotification,
  reservationCreatedNotification,
  reservationRejectedNotification,
} from "@/lib/notifications";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek } from "date-fns";
import { BUSINESS_TIMEZONE, OPEN_HOUR, CLOSE_HOUR } from "@/lib/reservation-rules";
import { getAppSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

const reservationSchema = z.object({
  commonAreaId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

type DbClient = Awaited<ReturnType<typeof createClient>>;

interface Occurrence {
  id: string;
  start_time: string;
  end_time: string;
  common_area_name: string;
}

/**
 * Valida e inserta UNA ocurrencia (extraído de createReservation para
 * reutilizar en reservas recurrentes sin duplicar reglas RN-02..RN-06/RN-09).
 * La ventana semanal se calcula sobre la fecha de la ocurrencia (no sobre
 * "ahora"), que es lo correcto para fechas futuras.
 */
async function tryCreateOccurrence(
  supabase: DbClient,
  userId: string,
  commonAreaId: string,
  startIso: string,
  endIso: string,
): Promise<{ occurrence?: Occurrence; error?: string }> {
  // Validaciones de negocio (reto-hackaton-reservas.pdf RN-02..RN-06, RN-09).
  // Todas en servidor; el cliente solo sugiere horarios.
  const start = new Date(startIso);
  const end = new Date(endIso);
  const now = new Date();

  if (!(start < end)) {
    return { error: "El fin debe ser posterior al inicio" };
  }

  // RN-02: bloques de 30 minutos (los minutos no dependen de zona horaria).
  if (start.getUTCMinutes() % 30 !== 0 || end.getUTCMinutes() % 30 !== 0) {
    return { error: "Las reservas son en bloques de 30 minutos (ej. 07:00, 07:30)" };
  }

  // RN-05: no pasado, mínimo N minutos de anticipación (configurable).
  const { minAdvanceMinutes } = await getAppSettings();
  if (start.getTime() - now.getTime() < minAdvanceMinutes * 60 * 1000) {
    return { error: `La reserva debe hacerse con al menos ${minAdvanceMinutes} minutos de anticipación` };
  }

  // RN-03 (decisión David, configurable por área): duración mínima/máxima.
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  // 6. RN-09: el área debe existir y estar activa (también en servidor,
  // para que no se pueda saltear por API directa). Sus reglas propias
  // mandan; si el área es vieja sin reglas, caen a los globales.
  const { data: area } = await supabase
    .from("common_areas")
    .select(
      "id, is_active, min_duration_hours, max_duration_hours, open_hour, close_hour, max_per_week",
    )
    .eq("id", commonAreaId)
    .single();

  if (!area || !area.is_active) {
    return { error: "Esa área no está disponible" };
  }

  const minDur = area.min_duration_hours ?? 3;
  const maxDur = area.max_duration_hours ?? 6;
  const openHour = area.open_hour ?? OPEN_HOUR;
  const closeHour = area.close_hour ?? CLOSE_HOUR;
  const maxPerWeek = area.max_per_week ?? 3;

  if (durationHours < minDur || durationHours > maxDur) {
    return { error: `En esta área la duración por reserva es de ${minDur} a ${maxDur} horas` };
  }

  // Horario del área en America/Costa_Rica ("00:00" = medianoche exacta = 24:00).
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const startCr = formatInTimeZone(start, BUSINESS_TIMEZONE, "HH:mm");
  const endCrRaw = formatInTimeZone(end, BUSINESS_TIMEZONE, "HH:mm");
  const sMin = toMin(startCr);
  const eMin = endCrRaw === "00:00" ? 1440 : toMin(endCrRaw);
  if (sMin < toMin(openHour) || eMin <= sMin || eMin > toMin(closeHour)) {
    return { error: `Horario de esta área: ${openHour} - ${closeHour}` };
  }

  // RN-06: máximo N activas por semana en ESTA área (domingo a sábado, ver D1).
  // La semana es la de la ocurrencia (las recurrentes caen en semanas futuras).
  const crStart = toZonedTime(start, BUSINESS_TIMEZONE);
  const weekStart = fromZonedTime(startOfWeek(crStart), BUSINESS_TIMEZONE);
  const weekEnd = fromZonedTime(endOfWeek(crStart), BUSINESS_TIMEZONE);

  const { data: userReservationsThisWeek, error: weekError } = await supabase
    .from("reservations")
    .select("id")
    .eq("user_id", userId)
    .eq("common_area_id", commonAreaId)
    .in("status", ["pending", "approved"])
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString());

  if (weekError) {
    return { error: weekError.message };
  }

  if (userReservationsThisWeek && userReservationsThisWeek.length >= maxPerWeek) {
    return { error: `Máximo ${maxPerWeek} reservas por semana en esta área` };
  }

  // 5. Check availability (no overlap)
  const { data: overlapping, error: overlapError } = await supabase
    .from("reservations")
    .select("id")
    .eq("common_area_id", commonAreaId)
    .in("status", ["pending", "approved"])
    .lt("start_time", endIso)
    .gt("end_time", startIso);

  if (overlapError) {
    return { error: overlapError.message };
  }

  if (overlapping && overlapping.length > 0) {
    return { error: "Ese horario ya está reservado. Elige otro." };
  }

  // Create reservation (el área ya se validó arriba: existe, activa y con reglas).
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      user_id: userId,
      common_area_id: commonAreaId,
      start_time: startIso,
      end_time: endIso,
      status: "pending",
    })
    .select("*, common_areas(name)")
    .single();

  if (error) {
    // Check if it's the exclusion constraint violation
    if (error.code === "23P01") {
      return { error: "Ese horario ya está reservado (conflicto en BD)" };
    }
    return { error: error.message };
  }

  return {
    occurrence: {
      id: reservation.id,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      common_area_name: reservation.common_areas?.name || "Área común",
    },
  };
}

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

  const { occurrence, error: occurrenceError } = await tryCreateOccurrence(
    supabase,
    user.id,
    validated.data.commonAreaId,
    validated.data.startTime,
    validated.data.endTime,
  );

  if (occurrenceError || !occurrence) {
    return { error: { form: [occurrenceError || "Error al crear reserva"] } };
  }

  // Forma compatible con el bloque de email/notificación de abajo.
  const reservation = {
    id: occurrence.id,
    start_time: occurrence.start_time,
    end_time: occurrence.end_time,
    common_areas: { name: occurrence.common_area_name },
  };

  // Send confirmation email (el email vive en auth.users, no en profiles)
  if (reservation) {
    await logAudit({
      actorId: user.id,
      action: "reservation.created",
      entityId: reservation.id,
      detail: `${reservation.common_areas?.name || "Área común"} ${reservation.start_time}`,
    });
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

    // Campanita in-app (no depende del email).
    await reservationCreatedNotification({
      userId: user.id,
      areaName: reservation.common_areas?.name || "Área común",
      when: format(parseISO(reservation.start_time), "d MMM HH:mm", { locale: es }),
      reservationId: reservation.id,
    });
  }

  return {
    success: "Reserva enviada. Espera aprobación del admin.",
    reservationId: reservation?.id,
  };
}

const recurringSchema = reservationSchema.extend({
  weeks: z.coerce.number().int().min(2).max(8),
});

/**
 * Serie semanal ("todos los lunes 7am"): crea una ocurrencia por semana
 * con las mismas reglas que una reserva simple. Las que choquen
 * (ocupado/límite) se omiten y se reportan; UN solo email + UN aviso.
 */
export async function createRecurringReservation(formData: FormData) {
  const validated = recurringSchema.safeParse({
    commonAreaId: formData.get("commonAreaId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    weeks: formData.get("weeks"),
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

  const baseStart = new Date(validated.data.startTime);
  const baseEnd = new Date(validated.data.endTime);
  const created: Occurrence[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < validated.data.weeks; i++) {
    const startIso = new Date(baseStart.getTime() + i * 7 * 24 * 3600 * 1000).toISOString();
    const endIso = new Date(baseEnd.getTime() + i * 7 * 24 * 3600 * 1000).toISOString();
    const { occurrence, error: occurrenceError } = await tryCreateOccurrence(
      supabase,
      user.id,
      validated.data.commonAreaId,
      startIso,
      endIso,
    );
    if (occurrence) {
      created.push(occurrence);
    } else {
      skipped.push(
        `${format(parseISO(startIso), "d MMM", { locale: es })} (${occurrenceError || "ocupado"})`,
      );
    }
  }

  if (created.length === 0) {
    return { error: { form: ["Ninguna fecha de la serie está disponible"] } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const areaName = created[0].common_area_name;
  const dates = created.map((o) =>
    format(parseISO(o.start_time), "EEEE d MMM HH:mm", { locale: es }),
  );

  // UN solo email resumen (no uno por ocurrencia).
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `🔁 Serie recibida: ${created.length} reserva(s) en ${areaName}`,
      html: reservationRecurringEmail({
        userName: profile?.full_name || "Residente",
        areaName,
        dates,
        skipped,
      }),
    });
  }

  // UN solo aviso in-app (referencia la primera ocurrencia).
  await notifyUser({
    user_id: user.id,
    title: `Serie recibida: ${created.length} reserva(s)`,
    body: `${areaName} · ${dates[0]}${created.length > 1 ? ` (+${created.length - 1} más)` : ""}`,
    type: "info",
    reservation_id: created[0].id,
  });

  await logAudit({
    actorId: user.id,
    action: "reservation.created",
    entityId: created[0].id,
    detail: `Serie semanal x${created.length} en ${areaName}`,
  });

  return {
    success:
      skipped.length === 0
        ? `${created.length} reservas creadas. Esperan aprobación del admin.`
        : `${created.length} creadas, ${skipped.length} omitida(s): ${skipped.join("; ")}`,
    reservationId: created[0].id,
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

  await reservationApprovedNotification({
    userId: reservation.user_id,
    areaName: reservation.common_areas?.name || "Área común",
    when: format(parseISO(reservation.start_time), "d MMM HH:mm", { locale: es }),
    reservationId: reservation.id,
  });

  await logAudit({
    actorId: user.id,
    action: "reservation.approved",
    entityId: reservation.id,
  });

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

  await reservationRejectedNotification({
    userId: reservation.user_id,
    areaName: reservation.common_areas?.name || "Área común",
    when: format(parseISO(reservation.start_time), "d MMM HH:mm", { locale: es }),
    reservationId: reservation.id,
  });

  await logAudit({
    actorId: user.id,
    action: "reservation.rejected",
    entityId: reservation.id,
    detail: adminNotes || undefined,
  });

  revalidateAdmin();
  return { success: "Reserva rechazada" };
}
