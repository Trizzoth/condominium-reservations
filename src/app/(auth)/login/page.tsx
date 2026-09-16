"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, sendMagicLink } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, SignInInput } from "@/lib/validations/auth";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/forms/form";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: SignInInput) {
    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    const result = await signIn(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al iniciar sesión" });
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    const email = form.getValues("email");
    if (!email) {
      setMessage({ type: "error", text: "Ingresa tu email primero" });
      setIsLoading(false);
      return;
    }
    const formData = new FormData();
    formData.set("email", email);
    const result = await sendMagicLink(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al enviar enlace" });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Regístrate
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
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Controller
                name="email"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    {...field}
                  />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Contraseña</FormLabel>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                ¿Olvidaste la contraseña?
              </Link>
            </div>
            <FormControl>
              <Controller
                name="password"
                control={form.control}
                render={({ field }) => (
                  <Input type="password" {...field} />
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Iniciar sesión"}
          </Button>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              O continuar con
            </span>
          </div>
        </div>

        <Form onSubmit={onMagicLink} className="space-y-6">
          <FormItem>
            <FormLabel>Email para enlace mágico</FormLabel>
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
          <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar enlace mágico"}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}