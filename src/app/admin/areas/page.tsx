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
import { Plus, Edit, Building2, Loader2 } from "lucide-react";

interface Area {
  id: string;
  name: string;
  description: string;
  capacity: number;
  rules: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formState = {
    name: "",
    description: "",
    capacity: 0,
    rules: "",
    is_active: true,
  };

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

    const areaData = {
      name: formState.name,
      description: formState.description,
      capacity: formState.capacity,
      rules: formState.rules,
      is_active: formState.is_active,
    };

    let result;
    if (editingArea) {
      result = await supabase.from("common_areas").update(areaData).eq("id", editingArea.id);
    } else {
      result = await supabase.from("common_areas").insert(areaData);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setDialogOpen(false);
      setEditingArea(null);
      resetForm();
      fetchAreas();
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
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingArea(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormState({
      name: "",
      description: "",
      capacity: 0,
      rules: "",
      is_active: true,
    });
  };

  const setFormState = (state: typeof formState) => {
    Object.assign(formState, state);
  };

  const toggleActive = async (area: Area) => {
    // A4: las áreas no se borran, se desactivan. D3: no desactivar con
    // futuras aprobadas (se bloquea con mensaje, no se pierde nada).
    if (area.is_active) {
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("common_area_id", area.id)
        .eq("status", "approved")
        .gte("start_time", new Date().toISOString());
      if (count && count > 0) {
        setError(
          `No se puede desactivar: tiene ${count} reserva(s) futura(s) aprobada(s). Cancélalas primero.`,
        );
        return;
      }
    }
    setError(null);
    const { error } = await supabase
      .from("common_areas")
      .update({ is_active: !area.is_active })
      .eq("id", area.id);
    if (error) setError(error.message);
    else fetchAreas();
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
                      >
                        {area.is_active ? "✓" : "○"}
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
