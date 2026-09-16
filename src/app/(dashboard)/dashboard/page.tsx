import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Users, Building2, Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, common_areas(name)")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });
  const { data: areas } = await supabase
    .from("common_areas")
    .select("*")
    .eq("is_active", true);

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {profile?.full_name || user.email}</h1>
          <p className="text-muted-foreground mt-1">Apartamento · {profile?.apartment || "Sin asignar"}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Áreas disponibles</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{areas?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Salón, piscina, cancha, etc.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas activas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reservations ? reservations.filter((r) => r.status === "approved").length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Próximas y en curso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reservations ? reservations.filter((r) => r.status === "pending").length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Esperando aprobación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total histórico</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservations ? reservations.length : 0}</div>
              <p className="text-xs text-muted-foreground">Reservas realizadas</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Próximas reservas</h2>
            <Button asChild>
              <Link href="/dashboard/reservations/new">
                <Plus className="mr-2 h-4 w-4" /> Nueva reserva
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {reservations && reservations.length > 0 ? (
              reservations.slice(0, 5).map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{reservation.common_areas?.name || "Área"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(reservation.start_time).toLocaleString("es-ES", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} -{" "}
                            {new Date(reservation.end_time).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reservation.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : reservation.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : reservation.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No tienes reservas aún</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/reservations/new">Crear tu primera reserva</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}