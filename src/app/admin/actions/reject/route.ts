import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const reservationId = formData.get("reservationId") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return redirect("/dashboard");

  await supabase
    .from("reservations")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  return redirect("/admin");
}