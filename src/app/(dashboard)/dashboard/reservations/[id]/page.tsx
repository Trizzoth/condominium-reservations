import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canCancelReservation } from "@/lib/reservation-rules";
import { getAppSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubmitButton from "@/components/ui/submit-button";
import Link from "next/link";
import { Calendar, Clock, CheckCircle, XCircle, ArrowLeft, QrCode, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import QRCode from "qrcode";

async function cancelReservation(formData: FormData) {
  "use server";
  const reservationId = formData.get("reservationId");
  if (typeof reservationId !== "string" || reservationId.length === 0) return;
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) return;
  const { cancelWindowHours } = await getAppSettings();
  const { data: target } = await supabase
    .from("reservations")
    .select("start_time")
    .eq("id", reservationId)
    .eq("user_id", currentUser.id)
    .eq("status", "pending")
    .single();
  if (!target || !canCancelReservation(target.start_time, new Date(), cancelWindowHours)) return;
  await supabase
    .from("reservations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("user_id", currentUser.id)
    .eq("status", "pending");
  await logAudit({ actorId: currentUser.id, action: "reservation.cancelled", entityId: reservationId });
  revalidatePath("/dashboard/reservations");
  redirect("/dashboard/reservations");
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Aprobada", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
  no_show: { label: "No se presentó", color: "bg-red-100 text-red-800", icon: XCircle },
} as const;

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reservation } = await supabase
    .from("reservations")
    .select("*, common_areas(name, rules)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!reservation) notFound();

  const config = statusConfig[reservation.status as keyof typeof statusConfig];
  const Icon = config?.icon || Calendar;
  const { cancelWindowHours } = await getAppSettings();
  const canCancel =
    reservation.status === "pending" &&
    canCancelReservation(reservation.start_time, new Date(), cancelWindowHours);

  let qr: string | null = null;
  if (reservation.status === "approved") {
    try {
      qr = await QRCode.toDataURL(reservation.id, { width: 320, margin: 1 });
    } catch {
      qr = null;
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard/reservations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mis reservas
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {reservation.common_areas?.name || "Área común"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${config?.color}`}>
              {config?.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              #{reservation.id.slice(0, 8)}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(parseISO(reservation.start_time), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {format(parseISO(reservation.start_time), "HH:mm", { locale: es })} -{" "}
              {format(parseISO(reservation.end_time), "HH:mm", { locale: es })}
            </p>
          </div>
          {reservation.common_areas?.rules && (
            <p className="text-sm text-muted-foreground">Reglas: {reservation.common_areas.rules}</p>
          )}
          {reservation.admin_notes && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="font-medium">Nota del admin: </span>
              {reservation.admin_notes}
            </div>
          )}
          {canCancel && (
            <form action={cancelReservation}>
              <input type="hidden" name="reservationId" value={reservation.id} />
              <SubmitButton variant="destructive" pendingText="Cancelando...">
                <Trash2 className="mr-2 h-4 w-4" /> Cancelar reserva
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      {qr && (
        <Card className="border-primary/30">
          <CardContent className="py-6 text-center">
            <p className="mb-3 flex items-center justify-center gap-2 font-medium">
              <QrCode className="h-5 w-5" /> QR de check-in
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR de check-in"
              width={240}
              height={240}
              className="mx-auto rounded-lg border bg-white"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Muestra esta pantalla en seguridad al llegar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
