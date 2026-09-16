"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, SignUpInput } from "@/lib/validations/auth";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/forms/form";

export default function RegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", apartment: "", phone: "" },
  });

  async function onSubmit(data: SignUpInput) {
    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("fullName", data.fullName);
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);
    formData.set("apartment", data.apartment || "");
    formData.set("phone", data.phone || "");
    const result = await signUp(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al registrarse" });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Crear cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
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
                render={({ field }) => (
                  <Input placeholder="Juan Pérez" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Controller
                name="email"
                control={form.control}
                render={({ field }) => (
                  <Input type="email" placeholder="tu@email.com" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Contraseña</FormLabel>
            <FormControl>
              <Controller
                name="password"
                control={form.control}
                render={({ field }) => (
                  <Input type="password" {...field} />
                )}
              />
            </FormControl>
            <FormDescription>Mínimo 6 caracteres</FormDescription>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Confirmar contraseña</FormLabel>
            <FormControl>
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field }) => (
                  <Input type="password" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Apartamento / Casa (opcional)</FormLabel>
            <FormControl>
              <Controller
                name="apartment"
                control={form.control}
                render={({ field }) => (
                  <Input placeholder="Ej: 101, Casa 5, Torre B - 302" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Teléfono (opcional)</FormLabel>
            <FormControl>
              <Controller
                name="phone"
                control={form.control}
                render={({ field }) => (
                  <Input type="tel" placeholder="+57 300 123 4567" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Registrando..." : "Crear cuenta"}
          </Button>
        </Form>
      </div>
    </div>
  );
}