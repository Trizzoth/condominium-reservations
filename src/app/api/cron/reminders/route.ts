import { createAdminClient, getUserEmailsByIds } from "@/lib/supabase/admin";
import { sendEmail, reservationReminderEmail } from "@/lib/emails";
import { logAudit } from "@/lib/audit";
import { format, parseISO, addDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { NextResponse } from "next/server";

// This endpoint should be called by Vercel Cron daily (ver vercel.json).
// Hace dos trabajos en una sola invocación (el plan limita los cron jobs):
// 1) recordatorios 24h, 2) marcar no-show de aprobadas vencidas sin check-in.
// Runs at 9 AM daily (America/Bogota = 14:00 UTC).

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // El cron de Vercel no lleva cookies de sesión, así que el cliente
  // con anon key + RLS devolvería 0 filas. Se usa service-role (solo servidor).
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("Cron reminders config error:", err);
    return NextResponse.json({ error: "Service-role client not configured" }, { status: 500 });
  }

  // Find reservations for tomorrow that are approved
  const tomorrow = addDays(new Date(), 1);
  const startOfTomorrow = startOfDay(tomorrow).toISOString();
  const endOfTomorrow = endOfDay(tomorrow).toISOString();

  // NOTA: `profiles` no tiene columna `email` (vive en auth.users):
  // se resuelve vía Admin API con service-role (solo servidor).
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name)")
    .eq("status", "approved")
    .gte("start_time", startOfTomorrow)
    .lte("start_time", endOfTomorrow);

  if (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  if (reservations && reservations.length > 0) {
    const emailsByUserId = await getUserEmailsByIds(reservations.map((r) => r.user_id));

    for (const reservation of reservations) {
      const recipientEmail = emailsByUserId.get(reservation.user_id as string);
      if (!recipientEmail) continue;

      const startFormatted = format(
        parseISO(reservation.start_time),
        "d 'de' MMMM yyyy 'a las' HH:mm",
        { locale: es },
      );
      const endFormatted = format(parseISO(reservation.end_time), "HH:mm", { locale: es });

      const result = await sendEmail({
        to: recipientEmail,
        subject: "Recordatorio: Tu reserva es mañana",
        html: reservationReminderEmail({
          userName: reservation.profiles?.full_name || "Residente",
          areaName: reservation.common_areas?.name || "Área común",
          startTime: startFormatted,
          endTime: endFormatted,
        }),
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error("Failed to send reminder:", result.error);
      }
    }
  }

  // 2) Marcar no-show: aprobadas ya terminadas sin check-in.
  const nowIso = new Date().toISOString();
  const { data: marked, error: noShowError } = await supabase
    .from("reservations")
    .update({ status: "no_show", updated_at: nowIso })
    .eq("status", "approved")
    .lt("end_time", nowIso)
    .is("checked_in_at", null)
    .select("id");

  if (noShowError) {
    console.error("Cron no-show error:", noShowError);
  } else if (marked && marked.length > 0) {
    // actor null = sistema (cron automático).
    for (const m of marked) {
      await logAudit({ actorId: null, action: "reservation.no_show", entityId: m.id });
    }
  }

  return NextResponse.json({
    message: "Cron processed",
    reminders: { sent, failed, total: reservations?.length || 0 },
    noShowsMarked: marked?.length || 0,
  });
}
