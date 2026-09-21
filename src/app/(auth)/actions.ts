"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  profileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { resolvePostLoginRedirect, homeForRole } from "@/lib/auth-redirect";
import { verifyTurnstile } from "@/lib/turnstile";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const validated = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  // Bot protection (solo si hay keys; sin ellas no bloquea).
  const turnstileToken = formData.get("turnstileToken");
  if (!(await verifyTurnstile(typeof turnstileToken === "string" ? turnstileToken : null))) {
    return { error: { form: ["Verificación anti-bots falló, reintenta"] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: { form: [error.message] } };
  }

  // Redirect según rol (admin→/admin, security→/security, resident→/dashboard),
  // respetando callbackUrl solo si el rol puede acceder a esa ruta.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const callbackUrl = formData.get("callbackUrl");
  redirect(
    resolvePostLoginRedirect(profile?.role, typeof callbackUrl === "string" ? callbackUrl : null),
  );
}

export async function signUp(formData: FormData) {
  const validated = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    apartment: formData.get("apartment"),
    phone: formData.get("phone"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  // Bot protection (solo si hay keys; sin ellas no bloquea).
  const turnstileToken = formData.get("turnstileToken");
  if (!(await verifyTurnstile(typeof turnstileToken === "string" ? turnstileToken : null))) {
    return { error: { form: ["Verificación anti-bots falló, reintenta"] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
        apartment: validated.data.apartment,
        phone: validated.data.phone,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  if (data.user && !data.session) {
    return { success: "Revisa tu email para confirmar la cuenta" };
  }

  redirect("/dashboard");
}

export async function sendMagicLink(formData: FormData) {
  const validated = magicLinkSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: validated.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  return { success: "Revisa tu email para el enlace mágico" };
}

export async function updateProfile(formData: FormData) {
  const validated = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    apartment: formData.get("apartment"),
    phone: formData.get("phone"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { form: ["No autenticado"] } };
  }

  // Service-role: RLS bloquea el upsert directo en `profiles` (probado en
  // prod: "new row violates row-level security policy"). El servidor valida
  // que solo toca su propia fila y el schema no admite `role` (no escalable).
  const adminDb = createAdminClient();
  const { error } = await adminDb.from("profiles").upsert({
    id: user.id,
    full_name: validated.data.fullName,
    apartment: validated.data.apartment,
    phone: validated.data.phone,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  return { success: "Perfil actualizado" };
}

export async function requestPasswordReset(formData: FormData) {
  const validated = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: { form: [error.message] } };
  }

  return { success: "Revisa tu email: enviamos un enlace para restablecer tu contraseña" };
}

export async function updatePassword(formData: FormData) {
  const validated = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: { form: ["Sesión inválida o enlace vencido. Pide un nuevo enlace."] } };
  }

  const { error } = await supabase.auth.updateUser({ password: validated.data.password });

  if (error) {
    return { error: { form: [error.message] } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  redirect(homeForRole(profile?.role));
}
