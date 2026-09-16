"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2 } from "lucide-react";
import { inviteUser, updateUserRole, deleteUser } from "../actions";

const ROLES = [
  { value: "resident", label: "Residente" },
  { value: "admin", label: "Admin" },
  { value: "security", label: "Seguridad" },
] as const;

export function InviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setSending(true);
    setMessage(null);
    const result = await inviteUser(new FormData(formEl));
    setSending(false);
    if ("error" in result && result.error) {
      const err = result.error as { form?: string[] } | string;
      setMessage({ type: "error", text: typeof err === "string" ? err : err.form?.[0] || "Error al invitar" });
    } else if ("success" in result && result.success) {
      setMessage({ type: "success", text: result.success });
      formEl.reset();
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" /> Invitar usuario
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="invite-email">Email *</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="nuevo@email.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-name">Nombre</Label>
        <Input id="invite-name" name="fullName" placeholder="Nombre completo" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-role">Rol *</Label>
        <Select name="role" defaultValue="resident">
          <SelectTrigger id="invite-role" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={sending}>{sending ? "Invitando..." : "Invitar"}</Button>
        <Button type="button" variant="outline" onClick={() => { setOpen(false); setMessage(null); }}>
          Cerrar
        </Button>
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function RoleSelect({ userId, currentRole, disabled }: { userId: string; currentRole: string; disabled?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(value: string) {
    if (value === currentRole) return;
    setSaving(true);
    setError(null);
    const result = await updateUserRole(userId, value);
    setSaving(false);
    if ("error" in result && result.error) {
      setError(typeof result.error === "string" ? result.error : "Error al cambiar rol");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select defaultValue={currentRole} onValueChange={onChange} disabled={disabled || saving}>
        <SelectTrigger className="w-32" title="Cambiar rol" aria-label="Cambiar rol">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function DeleteUserButton({ userId, disabled }: { userId: string; disabled?: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    setError(null);
    const result = await deleteUser(userId);
    setDeleting(false);
    if ("error" in result && result.error) {
      setError(typeof result.error === "string" ? result.error : "Error al eliminar");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="ghost" size="icon" className="text-red-600" title="Eliminar" aria-label="Eliminar usuario" onClick={onClick} disabled={disabled || deleting}>
        <Trash2 className="h-4 w-4" />
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
