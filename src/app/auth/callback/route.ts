import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginRedirect } from "@/lib/auth-redirect";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).single()
        : { data: null };
      return NextResponse.redirect(`${origin}${resolvePostLoginRedirect(profile?.role, next)}`);
    }
  }

  // Error: redirigir a login con mensaje
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}