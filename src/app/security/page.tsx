import { createClient } from "@/lib/supabase/server";
import { createAdminClient, getUserEmailsByIds } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Users,
  Building2,
  Clock,
  AlertCircle,
  UserCheck,
  UserX,
  ArrowRight,
  Phone,
  Search,
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import QrScanner from "@/components/security/qr-scanner";
import PullToRefresh from "@/components/ui/pull-to-refresh";
import { logAudit } from "@/lib/audit";

// wa.me gratis ($0, sin API): normaliza a E.164 sin "+".
// CR por defecto: números de 8 dígitos se prefijan con 506.
function toWaNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `506${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}
// Solo roles operativos pueden registrar movimientos de acceso.
async function requireSecurityRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "security" && profile?.role !== "admin") return null;
  return { supabase, userId: user.id };
}

// Server Actions (se invocan vía <form action>, no con onClick:
// este archivo es un Server Component y onClick no funciona en servidor).
async function checkIn(formData: FormData) {
  "use server";
  const auth = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!auth || typeof reservationId !== "string") return;
  await auth.supabase
    .from("reservations")
    .update({
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);
  await logAudit({ actorId: auth.userId, action: "reservation.checked_in", entityId: reservationId });
  revalidatePath("/security");
}

async function checkOut(formData: FormData) {
  "use server";
  const auth = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!auth || typeof reservationId !== "string") return;
  await auth.supabase
    .from("reservations")
    .update({
      checked_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);
  await logAudit({ actorId: auth.userId, action: "reservation.checked_out", entityId: reservationId });
  revalidatePath("/security");
}

async function markNoShow(formData: FormData) {
  "use server";
  const auth = await requireSecurityRole();
  const reservationId = formData.get("reservationId");
  if (!auth || typeof reservationId !== "string") return;
  await auth.supabase
    .from("reservations")
    .update({
      status: "no_show",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);
  await logAudit({ actorId: auth.userId, action: "reservation.no_show", entityId: reservationId });
  revalidatePath("/security");
}

export default async function SecurityDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Service-role: RLS impide a security ver reservas ajenas y profiles
  // ajenos. El layout de ruta ya validó el rol.
  const supabase = createAdminClient();
  const { code = "" } = await searchParams;
  const query = code.trim().toLowerCase();

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

  // Combine and deduplicate
  const allReservations = [...(activeReservations || [])];
  const seen = new Set<string>();
  const uniqueReservations = allReservations.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const emailsByUserId = await getUserEmailsByIds(
    uniqueReservations.map((r) => r.user_id),
  );

  const statusConfig = {
    pending_checkin: {
      label: "Pendiente check-in",
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
    },
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
      resident_email: emailsByUserId.get(r.user_id) || null,
    };
  });

  // Búsqueda por código (QR/email muestran el id): filtra la lista de hoy.
  const displayed = query
    ? reservationsWithStatus.filter((r) =>
        (r.id).toLowerCase().startsWith(query),
      )
    : reservationsWithStatus;

  const stats = {
    total: reservationsWithStatus.length,
    pending: reservationsWithStatus.filter((r) => r.security_status === "pending_checkin").length,
    inside: reservationsWithStatus.filter((r) => r.security_status === "checked_in").length,
    completed: reservationsWithStatus.filter((r) => r.security_status === "checked_out").length,
    noShow: reservationsWithStatus.filter((r) => r.security_status === "no_show").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Seguridad</h1>
          <p className="text-muted-foreground mt-1">
            Control de acceso - {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </p>
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
          <h2 className="text-xl font-semibold">
            {query ? `Resultado para "${query}"` : "Reservas de hoy"}
          </h2>
          <QrScanner initialCode={code} />
          <form method="GET" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="code"
                defaultValue={code}
                placeholder="Buscar por código de reserva (QR o email)"
                className="pl-9"
                minLength={4}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline">
                Buscar
              </Button>
              {query && (
                <Button variant="ghost" asChild>
                  <a href="/security">Limpiar</a>
                </Button>
              )}
            </div>
          </form>
          {displayed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {query ? "Sin coincidencias para ese código" : "No hay reservas para hoy"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <PullToRefresh>
            <div className="space-y-3">
              {displayed.map((r) => {
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
                            <p className="font-medium text-lg">
                              {r.profiles?.full_name || "Sin nombre"}
                            </p>
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
                            <span className="text-xs font-mono" title={r.id}>
                              #{(r.id).slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.security_status === "pending_checkin" &&
                          new Date(r.start_time) <= now && (
                            <div className="flex items-center gap-2">
                              <form action={checkIn}>
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                  <UserCheck className="mr-2 h-4 w-4" /> Entrada
                                </Button>
                              </form>
                              <form action={markNoShow}>
                                <input type="hidden" name="reservationId" value={r.id} />
                                <Button type="submit" variant="destructive">
                                  <UserX className="mr-2 h-4 w-4" /> No llegó
                                </Button>
                              </form>
                            </div>
                          )}
                        {r.security_status === "checked_in" && (
                          <form action={checkOut}>
                            <input type="hidden" name="reservationId" value={r.id} />
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {r.profiles?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {r.profiles.phone}
                            </span>
                          )}
                          {r.resident_email && <span>{r.resident_email}</span>}
                          {r.profiles?.phone && toWaNumber(r.profiles.phone) && (
                            <a
                              href={`https://wa.me/${toWaNumber(r.profiles.phone!)!}?text=${encodeURIComponent(
                                `Hola ${r.profiles?.full_name || "vecino"}, soy seguridad del condominio. Tu reserva de ${r.common_areas?.name || "área común"} hoy ${format(parseISO(r.start_time), "HH:mm", { locale: es })}-${format(parseISO(r.end_time), "HH:mm", { locale: es })} (#${r.id.slice(0, 8)}) sigue pendiente. ¿Vienes en camino?`,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 font-medium text-white hover:bg-green-700"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </PullToRefresh>
        )}
      </div>
    </div>
  );
}
