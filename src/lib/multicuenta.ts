import { createBrowserClient } from "@supabase/ssr";

export interface SavedAccount {
  userId: string;
  email: string;
  fullName: string | null;
  accessToken: string;
  refreshToken: string;
}

const KEY = "condominio-cuentas";
const MAX = 5;

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Cuentas guardadas en este navegador (solo tokens, nunca contraseñas). */
export function listAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (a): a is SavedAccount =>
        !!a && typeof a.userId === "string" && typeof a.refreshToken === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Guarda/actualiza la sesión actual para cambio rápido de cuenta.
 * Llamar tras login/getUser en los layouts (solo cliente).
 */
export async function recordCurrentAccount(): Promise<void> {
  try {
    const sb = client();
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session?.user?.email) return;
    const rest = listAccounts().filter((a) => a.userId !== session.user.id);
    rest.unshift({
      userId: session.user.id,
      email: session.user.email,
      fullName: (session.user.user_metadata?.full_name as string) || null,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    localStorage.setItem(KEY, JSON.stringify(rest.slice(0, MAX)));
  } catch {
    // Navegación privada o sin storage: el cambio rápido no aplica.
  }
}

/** Olvida una cuenta guardada (ej. token muerto). */
export function forgetAccount(userId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listAccounts().filter((a) => a.userId !== userId)));
  } catch {
    // ignorar
  }
}

/**
 * Salida SOLO local: borra la sesión de este navegador sin llamar al
 * servidor (los tokens guardados siguen vivos para el cambio rápido).
 * No usa supabase.auth.signOut() porque incluso con scope "local" el
 * backend revoca el refresh token (probado en vivo: 400 tras logout).
 * Nota de seguridad: en dispositivos compartidos esto no invalida la
 * sesión en el servidor; es el costo del cambio rápido de cuenta.
 */
export function localSignOut(): void {
  try {
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
      const name = c.split("=")[0]?.trim();
      if (name && name.startsWith("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    }
    const dead: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) dead.push(k);
    }
    dead.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignorar
  }
}

/**
 * Cambia a otra cuenta guardada sin pedir contraseña.
 * Retorna el email si funcionó, null si el token murió (y la olvida).
 */
export async function switchAccount(userId: string): Promise<string | null> {
  const acc = listAccounts().find((a) => a.userId === userId);
  if (!acc) return null;
  try {
    const sb = client();
    const { data, error } = await sb.auth.setSession({
      access_token: acc.accessToken,
      refresh_token: acc.refreshToken,
    });
    if (error || !data.session?.user?.email) {
      forgetAccount(userId);
      return null;
    }
    await recordCurrentAccount();
    return data.session.user.email;
  } catch {
    forgetAccount(userId);
    return null;
  }
}
