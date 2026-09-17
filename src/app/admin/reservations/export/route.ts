import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Descarga las reservas en CSV (respeta ?status=). Solo admin. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("No autorizado", { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const when = searchParams.get("when");

  const validStatuses = ["pending", "approved", "rejected", "cancelled", "no_show"] as const;
  type Status = (typeof validStatuses)[number];
  const statusFilter: Status | null =
    status && (validStatuses as readonly string[]).includes(status)
      ? (status as Status)
      : null;

  const adminDb = createAdminClient();
  let query = adminDb
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, apartment)")
    .order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const now = new Date();
  const inWhen = (iso: string) => {
    if (!when || when === "all") return true;
    const d = new Date(iso);
    if (when === "today") {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    }
    if (when === "week") {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      return d >= s && d <= e;
    }
    return true;
  };
  const filtered = (data || []).filter((r) => inWhen(r.start_time));

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[][] = [
    ["id", "residente", "apartamento", "area", "inicio", "fin", "estado", "creada"],
  ];
  for (const r of filtered) {
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
  const suffix = `${statusFilter ? `-${statusFilter}` : ""}${when && when !== "all" ? `-${when}` : ""}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas${suffix}.csv"`,
    },
  });
}
