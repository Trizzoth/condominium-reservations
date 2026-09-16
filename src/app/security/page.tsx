import { createClient } from "@/lib/supabase/server";
import { getUserEmailsByIds } from "@/lib/supabase/admin";
import { SecurityLayout } from "@/components/layout/security-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building2, Clock, AlertCircle, UserCheck, UserX, ArrowRight, Phone } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";

// Solo roles operativos pueden registrar movimientos de acceso.
async function requireSecurityRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "security" && profile?.role !== "admin") return null;
  return supabase;
}

// Server Actions (se invocan vía <form action>, no con onClick:
// este archivo es un Server Component y onClick no funciona en servidor).
async function checkIn(formData: FormData) {
  "use server";
  const supabase = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!supabase || typeof reservationId !== "string") return;
  await supabase
    .from("reservations")
    .update({
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", reservationId);
  revalidatePath("/security");
}

async function checkOut(formData: FormData) {
  "use server";
  const supabase = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!supabase || typeof reservationId !== "string") return;
  await supabase
    .from("reservations")
    .update({
      checked_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", reservationId);
  revalidatePath("/security");
}

async function markNoShow(formData: FormData) {
  "use server";
  const supabase = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!supabase || typeof reservationId !== "string") return;
  await supabase
    .from("reservations")
    .update({
      status: "no_show",
      updated_at: new Date().toISOString()
    })
    .eq("id", reservationId);
  revalidatePath("/security");
}

export default async function SecurityDashboardPage() {
  const supabase = await createClient();

  const today = new Date();
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  // Get all approved reservations for today (including ones that started earlier but haven't ended)
  // NOTA: `profiles` no tiene columna `email` (vive en auth.users):
  // se resuelve vía Admin API con service-role (solo servidor).
  const { data: activeReservations } = await supabase
    .from("reservations")
    .select("*, common_areas(name), profiles(full_name, apartment, phone)")
    .eq("status", "approved")
    .lte("start_time", endOfToday)
    .gte("end_time", startOfToday)
    .order("start_time", { ascending: true });

  const emailsByUserId = await getUserEmailsByIds(
    (activeReservations || []).map((r) => r.user_id as string)
  );

  // Combine and deduplicate
  const allReservations = [...(activeReservations || [])];
  const seen = new Set<string>();
  const uniqueReservations = allReservations.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const statusConfig = {
    pending_checkin: { label: "Pendiente check-in", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    checked_in: { label: "Dentro", color: "bg-green-100 text-green-800", icon: UserCheck },
    checked_out: { label: "Salió", color: "bg-blue-100 text-blue-800", icon: UserX },
    no_show: { label: "No llegó", color: "bg-red-100 text-red-800", icon: AlertCircle },
  } as const;

  // Determine status for each reservation
  const now = new Date();
  const reservationsWithStatus = uniqueReservations.map((r) => {
    const start = new Date(r.start_time);
    const end = new Date(r.end_time);
    const checkedInAt = r.checked_in_at ? new Date(r.checked_in_at) : null;
    const checkedOutAt = r.checked_out_at ? new Date(r.checked_out_at) : null;

    let status: keyof typeof statusConfig = "pending_checkin";
    
    if (checkedOutAt) {
      status = "checked_out";
    } else if (checkedInAt) {
      status = "checked_in";
    } else if (now > end && !checkedInAt) {
      status = "no_show";
    } else if (now >= start && now <= end) {
      status = "pending_checkin";
    } else if (now < start) {
      status = "pending_checkin";
    }

    return {
      ...r,
      security_status: status,
      resident_email: emailsByUserId.get(r.user_id as string) || null,
    };
  });

  const stats = {
    total: reservationsWithStatus.length,
    pending: reservationsWithStatus.filter(r => r.security_status === "pending_checkin").length,
    inside: reservationsWithStatus.filter(r => r.security_status === "checked_in").length,
    completed: reservationsWithStatus.filter(r => r.security_status === "checked_out").length,
    noShow: reservationsWithStatus.filter(r => r.security_status === "no_show").length,
  };

  return (
    <SecurityLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Seguridad</h1>
            <p className="text-muted-foreground mt-1">Control de acceso - {format(today, "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dentro</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.inside}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No-shows</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.noShow}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Reservas de hoy</h2>
          {reservationsWithStatus.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay reservas para hoy</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reservationsWithStatus.map((r) => {
                const statusKey = r.security_status as keyof typeof statusConfig;
                const config = statusConfig[statusKey];
                const Icon = config?.icon || Clock;
                const isActiveNow = new Date(r.start_time) <= now && new Date(r.end_time) >= now;
                
                return (
                  <Card key={r.id} className={isActiveNow ? "ring-2 ring-primary/50" : ""}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-muted">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-lg">{r.profiles?.full_name || "Sin nombre"}</p>
                              <Badge variant="default" className={config?.color}>
                                {config?.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {r.common_areas?.name || "Área"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {r.profiles?.apartment || "Sin apto"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {format(parseISO(r.start_time), "HH:mm", { locale: es })} -{" "}
                                {format(parseISO(r.end_time), "HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.security_status === "pending_checkin" && new Date(r.start_time) <= now && (
                            <div className="flex items-center gap-2">
                              <form action={checkIn}>
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button
                                  type="submit"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <UserCheck className="mr-2 h-4 w-4" /> Entrada
                                </Button>
                              </form>
                              <form action={markNoShow}>
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button
                                  type="submit"
                                  variant="destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" /> No llegó
                                </Button>
                              </form>
                            </div>
                          )}
                          {r.security_status === "checked_in" && (
                            <form action={checkOut}>
                              <input type="hidden" name="reservationId" value={r.id} />
                              <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <ArrowRight className="mr-2 h-4 w-4" /> Salida
                              </Button>
                            </form>
                          )}
                          {r.security_status === "checked_out" && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <UserX className="mr-1 h-3 w-3" /> Completado
                            </Badge>
                          )}
                          {r.security_status === "no_show" && (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" /> No-show
                            </Badge>
                          )}
                        </div>
                      </div>
                      {(r.profiles?.phone || r.resident_email) && (
                        <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {r.profiles?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {r.profiles.phone}
                              </span>
                            )}
                            {r.resident_email && (
                              <span>{r.resident_email}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SecurityLayout>
  );
}

