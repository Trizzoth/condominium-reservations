/**
 * Seed de datos de prueba (reto §7.4): 3 áreas, 2 miembros, 1 admin,
 * 10 reservas repartidas. Idempotente (borra su prefijo SEED- antes).
 *
 * Uso: node scripts/seed.ts   (lee SUPABASE_* de .env.local, nunca commitear)
 * Requiere Node 22+ (type stripping, sin dependencias).
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

const AREA_IDS: Record<string, string> = {};
const USER_IDS: Record<string, string> = {};

async function clean() {
  const areas: Array<{ id: string }> = await api(
    "GET",
    "/rest/v1/common_areas?select=id&name=like.SEED-*"
  );
  for (const a of areas) {
    await api("DELETE", `/rest/v1/reservations?common_area_id=eq.${a.id}`);
    await api("DELETE", `/rest/v1/availability_schedules?common_area_id=eq.${a.id}`);
    await api("DELETE", `/rest/v1/common_areas?id=eq.${a.id}`);
  }
  console.log(`limpieza: ${areas.length} áreas SEED-* y sus filas`);
}

async function main() {
  await clean();

  const areas = [
    { name: "SEED-Salón A", capacity: 50, open: "07:00:00", close: "21:00:00" },
    { name: "SEED-Salón B", capacity: 30, open: "07:00:00", close: "21:00:00" },
    { name: "SEED-Cancha", capacity: 20, open: "07:00:00", close: "21:00:00" },
  ];
  for (const a of areas) {
    const [row] = await api("POST", "/rest/v1/common_areas", {
      name: a.name,
      capacity: a.capacity,
      is_active: true,
    });
    AREA_IDS[a.name] = row.id;
    for (let d = 0; d < 7; d++) {
      await api("POST", "/rest/v1/availability_schedules", {
        common_area_id: row.id,
        day_of_week: d,
        open_time: a.open,
        close_time: a.close,
        max_duration_hours: 3,
      });
    }
  }
  console.log("áreas: 3 + 21 horarios");

  const users = [
    { email: "seed-miembro1@test.com", role: "resident" },
    { email: "seed-miembro2@test.com", role: "resident" },
    { email: "seed-admin@test.com", role: "admin" },
  ];
  for (const u of users) {
    try {
      const created = await api("POST", "/auth/v1/admin/users", {
        email: u.email,
        password: "Seed1234",
        email_confirm: true,
        user_metadata: { full_name: u.email, role: u.role },
      });
      USER_IDS[u.email] = created.id;
    } catch {
      const list: { users: Array<{ id: string; email?: string }> } = await api(
        "GET",
        "/auth/v1/admin/users"
      );
      const found = list.users.find((x) => x.email === u.email);
      if (!found) throw new Error(`sin usuario ${u.email}`);
      USER_IDS[u.email] = found.id;
    }
    await api("PATCH", `/rest/v1/profiles?id=eq.${USER_IDS[u.email]}`, { role: u.role });
  }
  console.log("usuarios: 2 miembros + 1 admin (clave: Seed1234)");

  // 10 reservas: días/slots distintos para no solapar (constraint EXCLUDE).
  const slots = [
    ["SEED-Salón A", "seed-miembro1@test.com", 1, "08:00", "10:00", "approved"],
    ["SEED-Salón A", "seed-miembro2@test.com", 1, "10:30", "12:00", "pending"],
    ["SEED-Salón A", "seed-miembro1@test.com", 2, "08:00", "09:00", "approved"],
    ["SEED-Salón B", "seed-miembro2@test.com", 1, "08:00", "11:00", "approved"],
    ["SEED-Salón B", "seed-miembro1@test.com", 3, "14:00", "16:00", "pending"],
    ["SEED-Cancha", "seed-miembro1@test.com", 1, "16:00", "18:00", "approved"],
    ["SEED-Cancha", "seed-miembro2@test.com", 2, "16:00", "17:00", "rejected"],
    ["SEED-Salón B", "seed-miembro2@test.com", 4, "09:00", "10:00", "cancelled"],
    ["SEED-Cancha", "seed-miembro1@test.com", 5, "09:00", "12:00", "approved"],
    ["SEED-Salón A", "seed-miembro2@test.com", 5, "14:00", "15:00", "no_show"],
  ] as const;
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  let n = 0;
  for (const [area, email, dayOff, sh, eh, status] of slots) {
    const day = new Date(base.getTime() + dayOff * 86400000);
    const d = day.toISOString().slice(0, 10);
    await api("POST", "/rest/v1/reservations", {
      user_id: USER_IDS[email],
      common_area_id: AREA_IDS[area],
      start_time: `${d}T${sh}:00+00:00`,
      end_time: `${d}T${eh}:00+00:00`,
      status,
    });
    n++;
  }
  console.log(`reservas: ${n} (mix pending/approved/rejected/cancelled/no_show)`);
  console.log("SEED OK");
}

main().catch((e) => {
  console.error("SEED FAIL:", e.message);
  process.exit(1);
});
