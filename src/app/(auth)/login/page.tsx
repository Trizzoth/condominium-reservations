"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, sendMagicLink } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, SignInInput } from "@/lib/validations/auth";
import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/forms/form";
import { Building2, Mail, Lock, Sparkles } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  // El middleware usa `redirect`, enlaces viejos pueden usar `callbackUrl`.
  // null = sin destino explícito → la Server Action usa el home del rol.
  const callbackUrl = searchParams.get("callbackUrl") ?? searchParams.get("redirect");
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
    // La Server Action redirige según rol; le pasamos el destino deseado
    // (solo se respeta si el rol puede acceder a esa ruta).
    if (callbackUrl) formData.set("callbackUrl", callbackUrl);
    const result = await signIn(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al iniciar sesión" });
    }
    // En éxito la Server Action hace redirect (no retorna): no hay else.
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <Building2 className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Bienvenido</h1>
          <p className="mt-2 text-muted-foreground">Inicia sesión en tu cuenta</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card p-8 animate-slide-up">
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 animate-fade-in ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"
              }`}
            >
              <span className="flex-shrink-0">
                {message.type === "success" ? (
                  <Sparkles className="h-5 w-5 text-green-600" />
                ) : (
                  <Sparkles className="h-5 w-5 text-red-600" />
                )}
              </span>
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" placeholder="tu@email.com" className="pl-10" {...field} />
                    </div>
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
                  className="text-sm text-primary hover:underline font-medium"
                >
                  ¿Olvidaste la contraseña?
                </Link>
              </div>
              <FormControl>
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="password" className="pl-10" {...field} />
                    </div>
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <Button
              type="submit"
              className="w-full py-3 text-base font-semibold rounded-xl shadow-soft hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Entrando...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </Form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">O continuar con</span>
            </div>
          </div>

          <Form onSubmit={onMagicLink} className="space-y-5">
            <FormItem>
              <FormLabel>Email para enlace mágico</FormLabel>
              <FormControl>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" placeholder="tu@email.com" className="pl-10" {...field} />
                    </div>
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <Button
              type="submit"
              variant="outline"
              className="w-full py-3 text-base font-semibold rounded-xl hover:bg-accent/50 transition-colors"
              disabled={isLoading}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isLoading ? "Enviando..." : "Enviar enlace mágico"}
            </Button>
          </Form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline ml-1">
              Regístrate
            </Link>
          </p>

          {process.env.NEXT_PUBLIC_DEMO_ACCOUNTS === "true" && (
            <div className="mt-6 rounded-xl border border-dashed border-border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Cuentas de prueba (solo demo: rellena, luego pulsa Iniciar sesión)
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Admin", email: "admin@test.com", password: "Admin123" },
                  { label: "Seguridad", email: "security@test.com", password: "Security123" },
                  { label: "Residente", email: "resident@test.com", password: "Resident123" },
                ].map((a) => (
                  <Button
                    key={a.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      form.setValue("email", a.email);
                      form.setValue("password", a.password);
                      setMessage(null);
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "200ms" }}>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            Reservas Condominio - Sistema de gestión de áreas comunes
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary rounded-full animate-spin border-t-transparent" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
