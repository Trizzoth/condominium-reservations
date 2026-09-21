import { createAdminClient, getUserEmailsByIds } from "@/lib/supabase/admin";
import {
  approveReservationAction,
  rejectReservationAction,
} from "@/app/(dashboard)/dashboard/reservations/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubmitButton from "@/components/ui/submit-button";
import { Calendar, Users, Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración | Reservas Condominio",
  description: "Aprobar reservas, ver ocupación y gestionar el condominio.",
};

// Wrappers FormData→string para usar las Server Actions directo en <form>
// (RULES: mutaciones con Server Actions, sin API Routes).
async function approve(formData: FormData) {
  "use server";
  await approveReservationAction(String(formData.get("reservationId") ?? ""));
}

async function reject(formData: FormData) {
  "use server";
  await rejectReservationAction(String(formData.get("reservationId") ?? ""));
}

export default async function AdminPage() {
  // Lecturas con service-role: RLS solo deja ver el profile propio.
  // El layout de ruta ya validó rol admin.
  const supabase = createAdminClient();

  // NOTA: `profiles` no tiene columna `email` (vive en auth.users):
  // se resuelve vía Admin API con service-role (solo servidor).
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, apartment)")
    .order("created_at", { ascending: false });

  const emailsByUserId = await getUserEmailsByIds(
    (reservations || []).map((r) => r.user_id),
  );
  const reservationsWithEmail = (reservations || []).map((r) => ({
    ...r,
    resident_email: emailsByUserId.get(r.user_id) || null,
  }));

  const { data: areas } = await supabase.from("common_areas").select("*").eq("is_active", true);
  const { data: profiles } = await supabase.from("profiles").select("*").eq("role", "resident");

  // Stats con datos que ya hay (sin nuevas tablas ni dependencias).
  const activeReservations = (reservations || []).filter(
    (r) => r.status === "approved" || r.status === "pending",
  );
  const byArea = new Map<string, number>();
  for (const r of activeReservations) {
    const name = r.common_areas?.name || "Sin área";
    byArea.set(name, (byArea.get(name) || 0) + 1);
  }
  const topAreas = [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxArea = topAreas[0]?.[1] || 1;

  const byHour = new Map<string, number>();
  for (const r of activeReservations) {
    try {
      const h = format(parseISO(r.start_time), "HH:00");
      byHour.set(h, (byHour.get(h) || 0) + 1);
    } catch {
      // fecha inválida: se ignora en stats
    }
  }
  const topHours = [...byHour.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxHour = topHours[0]?.[1] || 1;

  const byUser = new Map<string, { name: string; apartment: string; count: number }>();
  for (const r of reservationsWithEmail) {
    if (r.status === "cancelled" || r.status === "rejected") continue;
    const prev = byUser.get(r.user_id) || {
      name: r.profiles?.full_name || r.resident_email || "Sin nombre",
      apartment: r.profiles?.apartment || "",
      count: 0,
    };
    prev.count += 1;
    byUser.set(r.user_id, prev);
  }
  const topResidents = [...byUser.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const maxResident = topResidents[0]?.count || 1;

  // Stats v2: no-shows por residente + mapa día×hora (todo con datos que ya hay).
  const byNoShow = new Map<string, { name: string; apartment: string; count: number }>();
  for (const r of reservationsWithEmail) {
    if (r.status !== "no_show") continue;
    const prev = byNoShow.get(r.user_id) || {
      name: r.profiles?.full_name || r.resident_email || "Sin nombre",
      apartment: r.profiles?.apartment || "",
      count: 0,
    };
    prev.count += 1;
    byNoShow.set(r.user_id, prev);
  }
  const topNoShows = [...byNoShow.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const maxNoShow = topNoShows[0]?.count || 1;

  const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const HEAT_HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06–23
  const heat = new Map<string, number>();
  let heatMax = 1;
  for (const r of activeReservations) {
    try {
      const d = parseISO(r.start_time);
      const key = `${d.getDay()}-${d.getHours()}`;
      const n = (heat.get(key) || 0) + 1;
      heat.set(key, n);
      if (n > heatMax) heatMax = n;
    } catch {
      // fecha inválida: se ignora
    }
  }

  const statusConfig = {
    pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    approved: { label: "Aprobada", color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { label: "Rechazada", color: "bg-red-100 text-red-800", icon: XCircle },
    cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
  } as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-muted-foreground mt-1">Gestiona reservas, áreas y usuarios</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total reservas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservations?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {reservations?.filter((r) => r.status === "pending").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas activas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{areas?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocupación por área</CardTitle>
          </CardHeader>
          <CardContent>
            {topAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <div className="space-y-2">
                {topAreas.map(([name, count]) => (
                  <div key={name} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{name}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.round((count / maxArea) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas pico</CardTitle>
          </CardHeader>
          <CardContent>
            {topHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <div className="space-y-2">
                {topHours.map(([hour, count]) => (
                  <div key={hour} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium tabular-nums">{hour}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-green-600"
                        style={{ width: `${Math.round((count / maxHour) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top residentes</CardTitle>
          </CardHeader>
          <CardContent>
            {topResidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <div className="space-y-2">
                {topResidents.map((u) => (
                  <div key={`${u.name}-${u.apartment}`} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">
                        {u.name}
                        {u.apartment ? ` · ${u.apartment}` : ""}
                      </span>
                      <span className="text-muted-foreground">{u.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-yellow-500"
                        style={{ width: `${Math.round((u.count / maxResident) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top no-shows</CardTitle>
          </CardHeader>
          <CardContent>
            {topNoShows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin no-shows 🎉</p>
            ) : (
              <div className="space-y-2">
                {topNoShows.map((u) => (
                  <div key={`${u.name}-${u.apartment}`} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">
                        {u.name}
                        {u.apartment ? ` · ${u.apartment}` : ""}
                      </span>
                      <span className="text-muted-foreground">{u.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-red-500"
                        style={{ width: `${Math.round((u.count / maxNoShow) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mapa día × hora (activas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {HEAT_HOURS.map((h) => (
                      <th key={h} className="p-1 font-medium text-muted-foreground">
                        {String(h).padStart(2, "0")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DOW.map((day, dow) => (
                    <tr key={day}>
                      <td className="p-1 text-left font-medium">{day}</td>
                      {HEAT_HOURS.map((h) => {
                        const n = heat.get(`${dow}-${h}`) || 0;
                        const alpha = n === 0 ? 0.06 : 0.15 + 0.85 * (n / heatMax);
                        return (
                          <td key={h} className="p-0.5">
                            <div
                              title={`${day} ${String(h).padStart(2, "0")}:00 — ${n} reserva(s)`}
                              className="flex h-6 items-center justify-center rounded"
                              style={{ backgroundColor: `rgba(59, 130, 246, ${alpha.toFixed(2)})` }}
                            >
                              {n > 0 && <span className="font-bold text-primary-foreground">{n}</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="pb-3 px-4">Residente</th>
                  <th className="pb-3 px-4">Área</th>
                  <th className="pb-3 px-4">Fecha / Hora</th>
                  <th className="pb-3 px-4">Estado</th>
                  <th className="pb-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservationsWithEmail?.map((r) => {
                  const config = statusConfig[r.status as keyof typeof statusConfig];
                  const Icon = config?.icon || Calendar;
                  return (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{r.profiles?.full_name || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.profiles?.apartment || "Sin apto"} · {r.resident_email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">{r.common_areas?.name || "N/A"}</td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p>{format(parseISO(r.start_time), "d MMM yyyy", { locale: es })}</p>
                          <p className="text-muted-foreground">
                            {format(parseISO(r.start_time), "HH:mm", { locale: es })} -{" "}
                            {format(parseISO(r.end_time), "HH:mm", { locale: es })}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={r.status === "pending" ? "secondary" : "default"}
                          className={config?.color}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        {r.status === "pending" && (
                          <div className="flex gap-2">
                            <form action={approve}>
                              <input type="hidden" name="reservationId" value={r.id} />
                              <SubmitButton size="sm" pendingText="Aprobando...">
                                <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                              </SubmitButton>
                            </form>
                            <form action={reject}>
                              <input type="hidden" name="reservationId" value={r.id} />
                              <SubmitButton size="sm" variant="destructive" pendingText="Rechazando...">
                                <XCircle className="h-4 w-4 mr-1" /> Rechazar
                              </SubmitButton>
                            </form>
                          </div>
                        )}
                        {r.status !== "pending" && (
                          <span className="text-sm text-muted-foreground">
                            {r.admin_notes ? `Nota: ${r.admin_notes}` : "Sin acciones"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reservations?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay reservas aún</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
