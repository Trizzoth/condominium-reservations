/**
 * Prueba de concurrencia (reto §7.5 y caso borde §4.1): 10 inserts
 * simultáneos al MISMO bloque de la MISMA área. El constraint EXCLUDE
 * (RN-01) debe dejar pasar exactamente 1. Limpia sus filas al final.
 *
 * Uso: node scripts/concurrencia.ts   (lee SUPABASE_* de .env.local)
 * Esperado: exitosas=1, fallidas=9 (todas 23P01 exclusion_violation).
 */
import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (t && !t.startsWith("#") && t.includes("=")) {
    const i = t.indexOf("=");
    env[t.slice(0, i)] = t.slice(i + 1);
  }
}
const URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const KEY = env["SUPABASE_SERVICE_ROLE_KEY"];
if (!URL || !KEY) throw new Error("Faltan SUPABASE_* en .env.local");

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(URL + path, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function insert(areaId: string, userId: string, slot: { start: string; end: string }): Promise<{ ok: boolean; code?: string }> {
  const res = await fetch(URL + "/rest/v1/reservations", {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      common_area_id: areaId,
      start_time: slot.start,
      end_time: slot.end,
      status: "pending",
    }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  const m = body.match(/"code":"([A-Za-z0-9]+)"/);
  return { ok: false, code: m?.[1] };
}

async function main() {
  const areas: Array<{ id: string }> = await api(
    "GET",
    "/rest/v1/common_areas?select=id&is_active=eq.true&order=created_at&limit=1"
  );
  const users: { users: Array<{ id: string; email?: string }> } = await api(
    "GET",
    "/auth/v1/admin/users"
  );
  const resident = users.users.find((u) => u.email === "resident@test.com");
  if (areas.length === 0 || !resident) throw new Error("Sin área activa o sin resident@test.com");
  const areaId = areas[0].id;
  const now = new Date(Date.now() + 48 * 3600000);
  now.setUTCMinutes(0, 0, 0);
  const slot = {
    start: now.toISOString(),
    end: new Date(now.getTime() + 3600000).toISOString(),
  };
  const results = await Promise.all(
    Array.from({ length: 10 }, () => insert(areaId, resident.id, slot))
  );
  const ok = results.filter((r) => r.ok).length;
  const codes = results.filter((r) => !r.ok).map((r) => r.code);

  // Limpieza: borra la fila que sí entró (y cualquiera residual del slot).
  await fetch(
    URL +
      `/rest/v1/reservations?common_area_id=eq.${areaId}&start_time=eq.${encodeURIComponent(slot.start)}`,
    {
      method: "DELETE",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    }
  );

  console.log(`intentos=10 exitosas=${ok} fallidas=${10 - ok}`);
  console.log(`codigos_fallo=${[...new Set(codes)].join(",")}`);
  if (ok === 1 && codes.every((c) => c === "23P01")) {
    console.log("CONCURRENCIA OK: exactamente 1 ganó, 9 rechazadas por EXCLUDE");
  } else {
    console.log("CONCURRENCIA FAIL: resultado inesperado");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("CONCURRENCIA ERROR:", e.message);
  process.exit(1);
});
