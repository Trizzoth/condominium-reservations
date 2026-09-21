import { z } from "zod";

/**
 * Teléfono normalizado: solo dígitos con código de país
 * (ej. 50688888888). Vacío = opcional no indicado.
 */
export const phoneSchema = z
  .string()
  .regex(/^\d{7,15}$/, "Teléfono inválido: usa solo números con código de país")
  .optional()
  .or(z.literal(""));

export const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Nombre muy corto").max(100),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
    apartment: z.string().optional(),
    phone: phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const magicLinkSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName: z.string().min(2, "Nombre muy corto").max(100),
  apartment: z.string().optional(),
  phone: phoneSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
