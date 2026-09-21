import { createClient } from "@/lib/supabase/server";
import { createAdminClient, getUserEmailsByIds } from "@/lib/supabase/admin";

/** Descarga los usuarios en CSV (respeta ?q= y ?role=). Solo admin. */
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
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const role = searchParams.get("role") || "all";

  const adminDb = createAdminClient();
  const { data: profiles, error } = await adminDb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });

  const emailsByUserId = await getUserEmailsByIds((profiles || []).map((p) => p.id));
  const filtered = (profiles || [])
    .map((p) => ({ ...p, email: emailsByUserId.get(p.id) || "" }))
    .filter((p) => {
      if (role !== "all" && p.role !== role) return false;
      if (!q) return true;
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.apartment || "").toLowerCase().includes(q)
      );
    });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[][] = [["nombre", "email", "apartamento", "telefono", "rol", "registrado"]];
  for (const p of filtered) {
    rows.push([p.full_name || "", p.email || "", p.apartment || "", p.phone || "", p.role, p.created_at]);
  }
  const csv = "﻿" + rows.map((row) => row.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usuarios.csv"`,
    },
  });
}
