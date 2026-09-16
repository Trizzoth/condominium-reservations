import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Marca como `no_show` las reservas aprobadas que ya terminaron
 * sin check-in. Pensado para Vercel Cron (ver vercel.json).
 * Requiere header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("Cron no-show config error:", err);
    return NextResponse.json({ error: "Service-role client not configured" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "no_show", updated_at: nowIso })
    .eq("status", "approved")
    .lt("end_time", nowIso)
    .is("checked_in_at", null)
    .select("id");

  if (error) {
    console.error("Cron no-show error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "No-shows processed", marked: data?.length || 0 });
}
