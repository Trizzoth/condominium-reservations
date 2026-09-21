"use client";

import { useEffect, useState } from "react";
import { updateProfile } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileInput } from "@/lib/validations/auth";
import PhoneInput from "@/components/forms/phone-input";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/forms/form";

export default function ProfilePage() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", apartment: "", phone: "" },
  });

  // Precarga los datos guardados (lectura propia permitida por RLS).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, apartment, phone")
        .eq("id", user.id)
        .single();
      if (profile) {
        form.reset({
          fullName: profile.full_name || "",
          apartment: profile.apartment || "",
          phone: profile.phone || "",
        });
      }
    });
  }, [form]);

  async function onSubmit(data: ProfileInput) {
    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("fullName", data.fullName);
    formData.set("apartment", data.apartment || "");
    formData.set("phone", data.phone || "");
    const result = await updateProfile(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al actualizar" });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Mi perfil</h1>

      <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <FormItem>
          <FormLabel>Nombre completo</FormLabel>
          <FormControl>
            <Controller
              name="fullName"
              control={form.control}
              render={({ field }) => <Input placeholder="Juan Pérez" {...field} />}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Apartamento / Casa</FormLabel>
          <FormControl>
            <Controller
              name="apartment"
              control={form.control}
              render={({ field }) => (
                <Input placeholder="Ej: 101, Casa 5, Torre B - 302" {...field} />
              )}
            />
          </FormControl>
          <FormDescription>Para que seguridad te identifique</FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Teléfono</FormLabel>
          <FormControl>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput value={field.value || ""} onChange={field.onChange} />
              )}
            />
          </FormControl>
          <FormDescription>Opcional, para contactos urgentes</FormDescription>
          <FormMessage />
        </FormItem>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </Form>
    </div>
  );
}
