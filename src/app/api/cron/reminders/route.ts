import { createClient } from "@/lib/supabase/server";
import { sendEmail, reservationReminderEmail } from "@/lib/emails";
import { format, parseISO, addDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { NextResponse } from "next/server";

// This endpoint should be called by Vercel Cron or Supabase pg_cron daily
// Vercel Cron: add to vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
// Runs at 9 AM daily

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Find reservations for tomorrow that are approved
  const tomorrow = addDays(new Date(), 1);
  const startOfTomorrow = startOfDay(tomorrow).toISOString();
  const endOfTomorrow = endOfDay(tomorrow).toISOString();

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, email)")
    .eq("status", "approved")
    .gte("start_time", startOfTomorrow)
    .lte("start_time", endOfTomorrow);

  if (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!reservations || reservations.length === 0) {
    return NextResponse.json({ message: "No reminders to send", count: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const reservation of reservations) {
    if (!reservation.profiles?.email) continue;

    const startFormatted = format(parseISO(reservation.start_time), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
    const endFormatted = format(parseISO(reservation.end_time), "HH:mm", { locale: es });

    const result = await sendEmail({
      to: reservation.profiles.email,
      subject: "⏰ Recordatorio: Tu reserva es mañana",
      html: reservationReminderEmail({
        userName: reservation.profiles.full_name || "Residente",
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

  return NextResponse.json({ message: "Reminders processed", sent, failed, total: reservations.length });
}