"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validations/auth";
import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/forms/form";
import { Building2, Lock, Sparkles } from "lucide-react";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setChecking(false);
    });
  }, []);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);
    const result = await updatePassword(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al actualizar" });
    }
    // En éxito la Server Action redirige a tu panel: no hay else.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-fade-in">
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <Building2 className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Nueva contraseña</h1>
          <p className="mt-2 text-muted-foreground">Elige tu nueva contraseña</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card p-8 animate-slide-up">
          {checking ? (
            <p className="text-center text-muted-foreground">Verificando enlace...</p>
          ) : !hasSession ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 flex items-center gap-3">
                <Sparkles className="h-5 w-5 shrink-0" />
                <span className="font-medium">Enlace inválido o vencido. Pide uno nuevo.</span>
              </div>
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                Pedir nuevo enlace
              </Link>
            </div>
          ) : (
            <>
              {message && (
                <div className="mb-6 p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 flex items-center gap-3 animate-fade-in">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{message.text}</span>
                </div>
              )}

              <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <Controller
                      name="password"
                      control={form.control}
                      render={({ field }) => (
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>

                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <Controller
                      name="confirmPassword"
                      control={form.control}
                      render={({ field }) => (
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Repite la contraseña"
                            className="pl-10"
                            {...field}
                          />
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
                  {isLoading ? "Guardando..." : "Guardar nueva contraseña"}
                </Button>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
