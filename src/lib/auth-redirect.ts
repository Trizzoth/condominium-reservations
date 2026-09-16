export type UserRole = "admin" | "security" | "resident";

/** Panel de inicio según rol. */
export function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "security") return "/security";
  return "/dashboard";
}

/** Prefijos de ruta permitidos por rol (además de "/"). */
function allowedPrefixes(role: string | null | undefined): string[] {
  if (role === "admin") return ["/admin", "/dashboard"];
  if (role === "security") return ["/security", "/dashboard"];
  return ["/dashboard"];
}

/**
 * Destino post-login: respeta `next`/`callbackUrl` solo si es una ruta
 * interna permitida para el rol (evita open redirects a //evil.com).
 * Si no, cae al home del rol.
 */
export function resolvePostLoginRedirect(
  role: string | null | undefined,
  next: string | null | undefined
): string {
  const home = homeForRole(role);
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  if (next === "/") return home;
  if (allowedPrefixes(role).some((p) => next === p || next.startsWith(p + "/"))) {
    return next;
  }
  return home;
}
