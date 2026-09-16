import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Search, MoreHorizontal, Shield, User, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

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
          <div className="flex gap-2">
            <Button variant="outline"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Invitar usuario</Button>
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
                  {profiles?.map((p) => {
                    const config = roleConfig[p.role as keyof typeof roleConfig];
                    const Icon = config?.icon || User;
                    return (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{p.full_name || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground">{p.id.slice(0, 8)}...</p>
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
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" title="Cambiar rol">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600" title="Eliminar">
                              <User className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {profiles?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay usuarios registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}