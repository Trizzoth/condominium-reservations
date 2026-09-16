import { approveReservationAction } from "@/app/(dashboard)/dashboard/reservations/actions";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const reservationId = formData.get("reservationId") as string;

  const result = await approveReservationAction(reservationId);

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error }), { status: 400 });
  }

  return redirect("/admin");
}
