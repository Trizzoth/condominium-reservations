import { describe, it, expect } from "vitest";
import { homeForRole, resolvePostLoginRedirect } from "./auth-redirect";

describe("homeForRole", () => {
  it("admin va a /admin", () => expect(homeForRole("admin")).toBe("/admin"));
  it("security va a /security", () => expect(homeForRole("security")).toBe("/security"));
  it("resident va a /dashboard", () => expect(homeForRole("resident")).toBe("/dashboard"));
  it("rol desconocido/nulo cae en /dashboard", () => {
    expect(homeForRole(null)).toBe("/dashboard");
    expect(homeForRole(undefined)).toBe("/dashboard");
    expect(homeForRole("hacker")).toBe("/dashboard");
  });
});

describe("resolvePostLoginRedirect", () => {
  it("sin destino usa el home del rol", () => {
    expect(resolvePostLoginRedirect("admin", null)).toBe("/admin");
    expect(resolvePostLoginRedirect("security", undefined)).toBe("/security");
  });
  it("respeta destino permitido del rol", () => {
    expect(resolvePostLoginRedirect("admin", "/admin/reservations")).toBe("/admin/reservations");
    expect(resolvePostLoginRedirect("resident", "/dashboard/profile")).toBe("/dashboard/profile");
  });
  it("ignora destino de otro rol", () => {
    expect(resolvePostLoginRedirect("resident", "/admin/users")).toBe("/dashboard");
    expect(resolvePostLoginRedirect("security", "/admin")).toBe("/security");
  });
  it("bloquea open redirects", () => {
    expect(resolvePostLoginRedirect("admin", "//evil.com")).toBe("/admin");
    expect(resolvePostLoginRedirect("admin", "https://evil.com")).toBe("/admin");
  });
  it("permite /reset-password (flujo recovery)", () => {
    expect(resolvePostLoginRedirect("resident", "/reset-password")).toBe("/reset-password");
  });
});
