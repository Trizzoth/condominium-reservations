import { createClient } from "@/lib/supabase/server";
import { createAdminClient, getUserEmailsByIds } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Shield, User, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { InviteUserForm, RoleSelect, DeleteUserButton } from "./user-actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  // Service-role: RLS solo deja ver el profile propio. Layout ya validó admin.
  const adminDb = createAdminClient();
  // Sesión para saber quién es el admin actual (bloquear auto-edición).
  const userClient = await createClient();
  const {
    data: { user: currentUser },
  } = await userClient.auth.getUser();

  const { q = "", role = "all" } = await searchParams;

  const { data: profiles } = await adminDb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const emailsByUserId = await getUserEmailsByIds((profiles || []).map((p) => p.id as string));
  const query = q.trim().toLowerCase();
  const filtered = (profiles || [])
    .map((p) => ({ ...p, email: emailsByUserId.get(p.id as string) || null }))
    .filter((p) => {
      if (role !== "all" && p.role !== role) return false;
      if (!query) return true;
      return (
        (p.full_name || "").toLowerCase().includes(query) ||
        (p.email || "").toLowerCase().includes(query) ||
        (p.apartment || "").toLowerCase().includes(query)
      );
    });

  const roleConfig = {
    resident: { label: "Residente", color: "bg-blue-100 text-blue-800", icon: User },
    admin: { label: "Admin", color: "bg-purple-100 text-purple-800", icon: Shield },
    security: { label: "Seguridad", color: "bg-orange-100 text-orange-800", icon: Building2 },
  } as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de usuarios</h1>
          <p className="text-muted-foreground mt-1">Administra residentes, admins y seguridad</p>
        </div>
        <div className="flex flex-col gap-3">
          <form method="GET" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Nombre, email o apartamento"
                className="pl-9"
              />
            </div>
            <Select name="role" defaultValue={role}>
              <SelectTrigger className="w-40" aria-label="Filtrar por rol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="resident">Residentes</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="security">Seguridad</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
          {(q || role !== "all") && (
            <a href="/admin/users" className="text-sm font-medium text-primary hover:underline">
              Limpiar filtros
            </a>
          )}
          <InviteUserForm />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residentes</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {profiles?.filter((p) => p.role === "resident").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {profiles?.filter((p) => p.role === "admin").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b">
                  <th className="pb-3 px-4">Usuario</th>
                  <th className="pb-3 px-4">Rol</th>
                  <th className="pb-3 px-4">Apartamento</th>
                  <th className="pb-3 px-4">Teléfono</th>
                  <th className="pb-3 px-4">Registrado</th>
                  <th className="pb-3 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered?.map((p) => {
                  const config = roleConfig[p.role as keyof typeof roleConfig];
                  const Icon = config?.icon || User;
                  const isSelf = currentUser && p.id === currentUser.id;
                  return (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{p.full_name || p.email || "Sin nombre"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.full_name && p.email
                              ? p.email
                              : `${(p.id as string).slice(0, 8)}...`}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="default" className={config?.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">{p.apartment || "—"}</td>
                      <td className="py-4 px-4">{p.phone || "—"}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {format(parseISO(p.created_at), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <RoleSelect
                            userId={p.id as string}
                            currentRole={p.role}
                            disabled={!!isSelf}
                          />
                          <DeleteUserButton userId={p.id as string} disabled={!!isSelf} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {q || role !== "all"
                    ? "Sin resultados para esos filtros"
                    : "No hay usuarios registrados"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
