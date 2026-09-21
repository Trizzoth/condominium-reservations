"use client";

import { useEffect, useRef, useState } from "react";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setAvatarUrl((user.user_metadata?.avatar_url as string) || null);
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

  /** Foto de perfil: comprime a 256px y la sube a `avatars/{userId}.jpg`. */
  const handleAvatar = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const blob: Blob = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          const size = 256;
          const scale = Math.min(1, size / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Compresión falló"))),
            "image/jpeg",
            0.85,
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("No se pudo leer la imagen"));
        };
        img.src = url;
      });
      const path = `${user.id}.jpg`;
      const { error: upError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upError) throw new Error(upError.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: metaError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (metaError) throw new Error(metaError.message);
      setAvatarUrl(publicUrl);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setAvatarBusy(false);
    }
  };

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

      <div className="mb-6 flex items-center gap-4 p-4 border rounded-xl">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            ?
          </div>
        )}
        <div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={avatarBusy}
            onClick={() => avatarRef.current?.click()}
          >
            {avatarBusy ? "Subiendo..." : "Cambiar foto"}
          </Button>
          {avatarError && <p className="mt-1 text-xs text-destructive">{avatarError}</p>}
        </div>
      </div>

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
