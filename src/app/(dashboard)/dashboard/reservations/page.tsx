import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Plus, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Server Action: cancela una reserva propia en estado pendiente.
// Se usa como `action` de un <form>, que es la forma válida de invocar
// Server Actions desde un Server Component (onClick no funciona aquí).
async function cancelReservation(formData: FormData) {
  "use server";
  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string" || reservationId.length === 0) return;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return;
  await supabase
    .from("reservations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("user_id", currentUser.id)
    .eq("status", "pending");
  revalidatePath("/dashboard/reservations");
}

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, common_areas(name)")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });

  const statusConfig = {
    pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    approved: { label: "Aprobada", color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { label: "Rechazada", color: "bg-red-100 text-red-800", icon: XCircle },
    cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
    no_show: { label: "No se presentó", color: "bg-red-100 text-red-800", icon: XCircle },
  } as const;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis reservas</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus reservas de áreas comunes</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/reservations/new">
              <Plus className="mr-2 h-4 w-4" /> Nueva reserva
            </Link>
          </Button>
        </div>

        {!reservations || reservations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tienes reservas</h3>
              <p className="text-muted-foreground mb-6">Empieza reservando tu primera área común</p>
              <Button asChild>
                <Link href="/dashboard/reservations/new">Crear reserva</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reservations!.map((reservation) => {
              const config = statusConfig[reservation.status as keyof typeof statusConfig];
              const Icon = config?.icon || Calendar;
              const canCancel = reservation.status === "pending";
              return (
                <Card key={reservation.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">{reservation.common_areas?.name || "Área común"}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(reservation.start_time), "EEEE d 'de' MMMM", { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(parseISO(reservation.start_time), "HH:mm", { locale: es })} -{" "}
                              {format(parseISO(reservation.end_time), "HH:mm", { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config?.color}`}>
                          {config?.label}
                        </span>
                        {canCancel && (
                          <form action={cancelReservation}>
                            <input type="hidden" name="reservationId" value={reservation.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              title="Cancelar reserva"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                    {reservation.admin_notes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                        <span className="font-medium">Nota del admin: </span>
                        {reservation.admin_notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}