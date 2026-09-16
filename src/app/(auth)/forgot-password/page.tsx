"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validations/auth";
import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/forms/form";
import { Building2, Mail, Sparkles, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("email", data.email);
    const result = await requestPasswordReset(formData);
    setIsLoading(false);
    if (result?.error) {
      const err = result.error as { form?: string[] };
      setMessage({ type: "error", text: err.form?.[0] || "Error al enviar el enlace" });
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
          <h1 className="text-3xl font-bold text-foreground">Recuperar contraseña</h1>
          <p className="mt-2 text-muted-foreground">Te enviamos un enlace para restablecerla</p>
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
              <Sparkles className="h-5 w-5 shrink-0" />
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

            <Button
              type="submit"
              className="w-full py-3 text-base font-semibold rounded-xl shadow-soft hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar enlace"}
            </Button>
          </Form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
