"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Building2, Loader2, Check, X } from "lucide-react";
import { saveArea, toggleAreaActive } from "./actions";

interface Area {
  id: string;
  name: string;
  description: string;
  capacity: number;
  rules: string;
  is_active: boolean;
  min_duration_hours: number;
  max_duration_hours: number;
  open_hour: string;
  close_hour: string;
  max_per_week: number;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  capacity: 0,
  rules: "",
  is_active: true,
  min_duration_hours: 3,
  max_duration_hours: 6,
  open_hour: "06:00",
  close_hour: "24:00",
  max_per_week: 3,
};

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formState, setFormState] = useState({ ...EMPTY_FORM });

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // Los setState viven en callbacks de promesa (no en el cuerpo síncrono
  // del efecto): evita renders en cascada.
  const fetchAreas = useCallback(() => {
    supabase
      .from("common_areas")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setAreas(data || []);
        setLoading(false);
      });
  }, [supabase]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    // Server Action (service-role): el browser-client no puede escribir
    // (policies Admins * exigen claim JWT inexistente, ver #61).
    const fd = new FormData();
    if (editingArea) fd.set("id", editingArea.id);
    fd.set("name", formState.name);
    fd.set("description", formState.description);
    fd.set("capacity", String(formState.capacity));
    fd.set("rules", formState.rules);
    fd.set("is_active", String(formState.is_active));
    fd.set("min_duration_hours", String(formState.min_duration_hours));
    fd.set("max_duration_hours", String(formState.max_duration_hours));
    fd.set("open_hour", formState.open_hour);
    fd.set("close_hour", formState.close_hour);
    fd.set("max_per_week", String(formState.max_per_week));

    const result = await saveArea(fd);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setDialogOpen(false);
      setEditingArea(null);
      resetForm();
      fetchAreas();
      setNotice("Área guardada. Las reservas nuevas ya usan estas reglas.");
    }
    setSubmitting(false);
  };

  const openEditDialog = (area: Area) => {
    setEditingArea(area);
    setFormState({
      name: area.name,
      description: area.description,
      capacity: area.capacity,
      rules: area.rules,
      is_active: area.is_active,
      min_duration_hours: area.min_duration_hours ?? 3,
      max_duration_hours: area.max_duration_hours ?? 6,
      open_hour: area.open_hour ?? "06:00",
      close_hour: area.close_hour ?? "24:00",
      max_per_week: area.max_per_week ?? 3,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingArea(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormState({ ...EMPTY_FORM });
  };

  const toggleActive = async (area: Area) => {
    // A4: las áreas no se borran, se desactivan (el guard de futuras
    // aprobadas vive en la Server Action con service-role).
    setError(null);
    setNotice(null);
    const result = await toggleAreaActive(area.id);
    if ("error" in result && result.error) setError(result.error);
    else {
      fetchAreas();
      if ("success" in result && result.success) setNotice(result.success);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de áreas comunes</h1>
          <p className="text-muted-foreground mt-1">Crea y configura áreas reservables</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Nueva área
        </Button>
      </div>

      {error && <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">{error}</div>}
      {notice && (
        <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">{notice}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Áreas registradas ({areas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay áreas creadas aún</p>
                  <Button onClick={openCreateDialog} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" /> Crear primera área
                  </Button>
                </div>
              ) : (
                areas.map((area) => (
                  <div
                    key={area.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{area.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Capacidad: {area.capacity} personas ·{" "}
                          {area.min_duration_hours ?? 3}–{area.max_duration_hours ?? 6}h ·{" "}
                          {area.open_hour ?? "06:00"}–{area.close_hour ?? "24:00"} ·{" "}
                          máx {area.max_per_week ?? 3}/sem{" "}
                          {area.is_active ? (
                            <Badge variant="default" className="ml-2">
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">
                              Inactiva
                            </Badge>
                          )}
                        </p>
                        {area.description && (
                          <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(area)}
                        className={area.is_active ? "text-green-600" : "text-gray-400"}
                        title={area.is_active ? "Desactivar" : "Activar"}
                      >
                        {area.is_active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(area)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingArea ? "Editar área" : "Nueva área común"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Ej: Salón de eventos, Piscina, Cancha de fútbol"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formState.capacity}
                  onChange={(e) =>
                    setFormState({ ...formState, capacity: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Descripción breve del área"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules">Reglas de uso</Label>
              <Textarea
                id="rules"
                value={formState.rules}
                onChange={(e) => setFormState({ ...formState, rules: e.target.value })}
                placeholder="Ej: Prohibido fumar, máximo 4 horas, reservar con 2h de anticipación"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_duration_hours">Duración mínima (horas)</Label>
                <Input
                  id="min_duration_hours"
                  type="number"
                  min="1"
                  max="24"
                  value={formState.min_duration_hours}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      min_duration_hours: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_duration_hours">Duración máxima (horas)</Label>
                <Input
                  id="max_duration_hours"
                  type="number"
                  min="1"
                  max="24"
                  value={formState.max_duration_hours}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_duration_hours: parseInt(e.target.value) || 6,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="open_hour">Apertura (HH:MM)</Label>
                <Input
                  id="open_hour"
                  value={formState.open_hour}
                  onChange={(e) => setFormState({ ...formState, open_hour: e.target.value })}
                  placeholder="06:00"
                  pattern="^([01]\d|2[0-3]):[0-5]\d$"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close_hour">Cierre (HH:MM, 24:00 = medianoche)</Label>
                <Input
                  id="close_hour"
                  value={formState.close_hour}
                  onChange={(e) => setFormState({ ...formState, close_hour: e.target.value })}
                  placeholder="24:00"
                  pattern="^([01]\d|2[0-4]):[0-5]\d$"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_per_week">Máx reservas/semana</Label>
                <Input
                  id="max_per_week"
                  type="number"
                  min="1"
                  max="20"
                  value={formState.max_per_week}
                  onChange={(e) =>
                    setFormState({ ...formState, max_per_week: parseInt(e.target.value) || 3 })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Estado</Label>
              <Select
                value={formState.is_active.toString()}
                onValueChange={(v) => setFormState({ ...formState, is_active: v === "true" })}
              >
                <SelectTrigger id="is_active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activa</SelectItem>
                  <SelectItem value="false">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando..." : editingArea ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
