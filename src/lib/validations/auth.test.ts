import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  profileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth";

describe("signInSchema", () => {
  it("acepta email y clave válidos", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.com", password: "123456" }).success
    ).toBe(true);
  });
  it("rechaza email inválido y clave corta", () => {
    const r = signInSchema.safeParse({ email: "no-email", password: "123" });
    expect(r.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const base = {
    fullName: "Ana Pérez",
    email: "ana@mail.com",
    password: "123456",
    confirmPassword: "123456",
  };
  it("acepta registro válido", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });
  it("rechaza claves distintas", () => {
    const r = signUpSchema.safeParse({ ...base, confirmPassword: "otra" });
    expect(r.success).toBe(false);
  });
  it("rechaza nombre muy corto", () => {
    expect(signUpSchema.safeParse({ ...base, fullName: "A" }).success).toBe(false);
  });
});

describe("magicLinkSchema y forgotPasswordSchema", () => {
  it("aceptan email válido", () => {
    expect(magicLinkSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
  it("rechazan email inválido", () => {
    expect(magicLinkSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("acepta perfil completo y mínimo", () => {
    expect(
      profileSchema.safeParse({ fullName: "Ana", apartment: "101", phone: "50688888888" })
        .success
    ).toBe(true);
    expect(profileSchema.safeParse({ fullName: "Ana" }).success).toBe(true);
  });
  it("rechaza nombre vacío", () => {
    expect(profileSchema.safeParse({ fullName: "" }).success).toBe(false);
  });
  it("rechaza teléfono con letras y acepta vacío", () => {
    expect(
      profileSchema.safeParse({ fullName: "Ana", phone: "abc123" }).success
    ).toBe(false);
    expect(profileSchema.safeParse({ fullName: "Ana", phone: "" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("acepta claves iguales de 6+", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "nueva12", confirmPassword: "nueva12" })
        .success
    ).toBe(true);
  });
  it("rechaza distintas o cortas", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "nueva12", confirmPassword: "otra12" })
        .success
    ).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "123", confirmPassword: "123" }).success).toBe(
      false
    );
  });
});
