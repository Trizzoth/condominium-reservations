"use server";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, magicLinkSchema, profileSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const validated = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: { form: [error.message] } };
  }

  redirect("/dashboard");
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: { form: ["No autenticado"] } };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
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