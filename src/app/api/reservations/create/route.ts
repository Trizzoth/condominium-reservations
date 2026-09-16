import { createReservation } from "@/app/(dashboard)/dashboard/reservations/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await createReservation(formData);
  return NextResponse.json(result);
}
