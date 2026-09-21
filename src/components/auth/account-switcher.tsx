'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import {
  listAccounts,
  switchAccount,
  type SavedAccount,
} from '@/lib/multicuenta';
import { homeForRole } from '@/lib/auth-redirect';
import { myRoleAction } from './actions';

/**
 * Cambio rápido de cuenta desde la foto de perfil.
 * Muestra las cuentas usadas en este navegador (sin contraseñas:
 * solo tokens de sesión, igual que el storage propio de Supabase).
 * Se renderiza DENTRO del DropdownMenuContent del avatar.
 */
export default function AccountSwitcherItems({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  // Inicializador perezoso (sin efecto): evita renders en cascada.
  const [accounts] = useState<SavedAccount[]>(() =>
    typeof window === 'undefined'
      ? []
      : listAccounts().filter((a) => a.userId !== currentUserId),
  );
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  if (accounts.length === 0) return null;

  const doSwitch = async (userId: string) => {
    setFailedId(null);
    setSwitchingId(userId);
    const email = await switchAccount(userId);
    if (!email) {
      // Token muerto: se olvidó sola; avisar y quedarse.
      setFailedId(userId);
      setSwitchingId(null);
      return;
    }
    // Rol por servidor (service-role, confiable) con reintento:
    // la cookie del setSession a veces tarda un tick en aplicar.
    let role: string | null = null;
    for (let i = 0; i < 3 && !role; i++) {
      role = await myRoleAction();
      if (!role) await new Promise((r) => setTimeout(r, 400));
    }
    router.push(homeForRole(role));
    router.refresh();
  };

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex items-center gap-2 text-xs">
        <ArrowLeftRight className="h-3 w-3" /> Cambiar de cuenta
      </DropdownMenuLabel>
      {accounts.map((a) => (
        <DropdownMenuItem
          key={a.userId}
          disabled={switchingId !== null}
          onSelect={(e) => {
            e.preventDefault();
            void doSwitch(a.userId);
          }}
          className="flex items-center gap-3 px-2 py-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(a.fullName || a.email)?.[0]?.toUpperCase() || '?'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {switchingId === a.userId ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cambiando...
                </span>
              ) : (
                (a.fullName || a.email)
              )}
            </span>
            {a.fullName && <span className="block truncate text-xs text-muted-foreground">{a.email}</span>}
          </span>
        </DropdownMenuItem>
      ))}
      {failedId && (
        <p className="px-4 py-1 text-xs text-destructive">
          Sesión vencida, entra con contraseña esa vez.
        </p>
      )}
    </>
  );
}
