"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Building2, Mail, Lock, User, Home, Sparkles } from "lucide-react";
import PhoneInput from "@/components/forms/phone-input";

export default function RegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      apartment: "",
      phone: "",
    },
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <Building2 className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Crear cuenta</h1>
          <p className="mt-2 text-muted-foreground">Únete a tu condominio</p>
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
                <Sparkles
                  className={`h-5 w-5 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
                />
              </span>
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Controller
                  name="fullName"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="Juan Pérez" className="pl-10" {...field} />
                    </div>
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
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input type="email" placeholder="tu@email.com" className="pl-10" {...field} />
                    </div>
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
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
                <FormDescription>Mínimo 6 caracteres</FormDescription>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Confirmar</FormLabel>
                <FormControl>
                  <Controller
                    name="confirmPassword"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>
                  Apartamento <span className="text-muted-foreground font-normal">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Controller
                    name="apartment"
                    control={form.control}
                    render={({ field }) => (
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="101, Casa 5" className="pl-10" {...field} />
                      </div>
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>
                  Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <PhoneInput value={field.value || ""} onChange={field.onChange} />
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </div>

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
                  Registrando...
                </span>
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </Form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline ml-1">
              Inicia sesión
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Al registrarte aceptas los{" "}
            <Link href="/terminos" className="underline hover:text-foreground">
              Términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="underline hover:text-foreground">
              Privacidad
            </Link>
            .
          </p>
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
