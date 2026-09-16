import { createClient } from "@/lib/supabase/server";
import { getUserEmailsByIds } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default async function AdminPage() {
  const supabase = await createClient();

  // NOTA: `profiles` no tiene columna `email` (vive en auth.users):
  // se resuelve vía Admin API con service-role (solo servidor).
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, apartment)")
    .order("created_at", { ascending: false });

  const emailsByUserId = await getUserEmailsByIds(
    (reservations || []).map((r) => r.user_id as string)
  );
  const reservationsWithEmail = (reservations || []).map((r) => ({
    ...r,
    resident_email: emailsByUserId.get(r.user_id as string) || null,
  }));

  const { data: areas } = await supabase.from("common_areas").select("*").eq("is_active", true);
  const { data: profiles } = await supabase.from("profiles").select("*").eq("role", "resident");

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
                          <Badge variant={r.status === "pending" ? "secondary" : "default"} className={config?.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config?.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {r.status === "pending" && (
                            <div className="flex gap-2">
                              <form action="/admin/actions/approve" method="POST">
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button type="submit" size="sm" variant="default">
                                  <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                                </Button>
                              </form>
                              <form action="/admin/actions/reject" method="POST">
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button type="submit" size="sm" variant="destructive">
                                  <XCircle className="h-4 w-4 mr-1" /> Rechazar
                                </Button>
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