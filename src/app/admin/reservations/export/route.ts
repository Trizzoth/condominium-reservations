import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Descarga las reservas en CSV (respeta ?status=). Solo admin. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return new Response("No autorizado", { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const adminDb = createAdminClient();
  let query = adminDb
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, apartment)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[][] = [["id", "residente", "apartamento", "area", "inicio", "fin", "estado", "creada"]];
  for (const r of data || []) {
    rows.push([
      r.id,
      r.profiles?.full_name || "",
      r.profiles?.apartment || "",
      r.common_areas?.name || "",
      r.start_time,
      r.end_time,
      r.status,
      r.created_at,
    ]);
  }
  const csv = "﻿" + rows.map((row) => row.map(esc).join(",")).join("\n");
  const suffix = status && status !== "all" ? `-${status}` : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas${suffix}.csv"`,
    },
  });
}
