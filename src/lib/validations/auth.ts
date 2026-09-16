import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Nombre muy corto").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
  apartment: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const magicLinkSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const profileSchema = z.object({
  fullName: z.string().min(2, "Nombre muy corto").max(100),
  apartment: z.string().optional(),
  phone: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;