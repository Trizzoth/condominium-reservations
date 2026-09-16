"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, Loader2, CalendarDays } from "lucide-react";

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

interface Schedule {
  id: string;
  common_area_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  max_duration_hours: number;
  common_areas?: { name: string };
  created_at: string;
}

interface Area {
  id: string;
  name: string;
}

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formState = {
    common_area_id: "",
    day_of_week: "1",
    open_time: "09:00",
    close_time: "22:00",
    max_duration_hours: 4,
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
  // del efecto): es el patrón documentado de fetch + setState al completar.
  const fetchData = useCallback(() => {
    Promise.all([
      supabase.from("common_areas").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("availability_schedules")
        .select("*, common_areas(name)")
        .order("common_area_id")
        .order("day_of_week"),
    ]).then(([areasRes, schedulesRes]) => {
      if (areasRes.error) setError(areasRes.error.message);
      else setAreas(areasRes.data || []);
      if (schedulesRes.error) setError(schedulesRes.error.message);
      else setSchedules(schedulesRes.data || []);
      setLoading(false);
    });
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const scheduleData = {
      common_area_id: formState.common_area_id,
      day_of_week: formState.day_of_week,
      open_time: formState.open_time,
      close_time: formState.close_time,
      max_duration_hours: formState.max_duration_hours,
    };

    let result;
    if (editingSchedule) {
      result = await supabase
        .from("availability_schedules")
        .update(scheduleData)
        .eq("id", editingSchedule.id);
    } else {
      result = await supabase.from("availability_schedules").insert(scheduleData);
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormState({
      common_area_id: schedule.common_area_id,
      day_of_week: schedule.day_of_week.toString(),
      open_time: schedule.open_time.slice(0, 5),
      close_time: schedule.close_time.slice(0, 5),
      max_duration_hours: schedule.max_duration_hours,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSchedule(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormState({
      common_area_id: areas[0]?.id || "",
      day_of_week: "1",
      open_time: "09:00",
      close_time: "22:00",
      max_duration_hours: 4,
    });
  };

  const setFormState = (state: typeof formState) => {
    Object.assign(formState, state);
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("¿Eliminar este horario?")) return;
    const { error } = await supabase.from("availability_schedules").delete().eq("id", id);
    if (error) setError(error.message);
    else fetchData();
  };

  const getSchedulesForArea = (areaId: string) => {
    return schedules.filter((s) => s.common_area_id === areaId);
  };

  const formatTime = (time: string) => time.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de horarios</h1>
          <p className="text-muted-foreground mt-1">
            Define disponibilidad por área y día de la semana
          </p>
        </div>
        <Button onClick={openCreateDialog} disabled={areas.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo horario
        </Button>
      </div>

      {error && <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">{error}</div>}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>
              No hay áreas activas. Crea una en{" "}
              <a href="/admin/areas" className="underline">
                Gestión de áreas
              </a>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {areas.map((area) => {
            const areaSchedules = getSchedulesForArea(area.id);
            return (
              <Card key={area.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {area.name}
                  </CardTitle>
                  <Button size="sm" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Agregar horario
                  </Button>
                </CardHeader>
                <CardContent>
                  {areaSchedules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Sin horarios configurados
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {DAYS.map((day) => {
                        const schedule = areaSchedules.find((s) => s.day_of_week === day.value);
                        return (
                          <div
                            key={day.value}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-24 font-medium capitalize">{day.label}</span>
                              {schedule ? (
                                <>
                                  <Badge variant="default">
                                    {formatTime(schedule.open_time)} -{" "}
                                    {formatTime(schedule.close_time)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    Máx {schedule.max_duration_hours}h
                                  </Badge>
                                </>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Cerrado
                                </Badge>
                              )}
                            </div>
                            {schedule && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteSchedule(schedule.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar horario" : "Nuevo horario"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area">Área *</Label>
              <Select
                value={formState.common_area_id}
                onValueChange={(v) => setFormState({ ...formState, common_area_id: v })}
              >
                <SelectTrigger id="area">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="day">Día de la semana *</Label>
                <Select
                  value={formState.day_of_week}
                  onValueChange={(v) => setFormState({ ...formState, day_of_week: v })}
                >
                  <SelectTrigger id="day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDuration">Duración máxima (horas) *</Label>
                <Input
                  id="maxDuration"
                  type="number"
                  min="1"
                  max="12"
                  value={formState.max_duration_hours}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_duration_hours: parseInt(e.target.value) || 4,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="open">Hora apertura *</Label>
                <Input
                  id="open"
                  type="time"
                  value={formState.open_time}
                  onChange={(e) => setFormState({ ...formState, open_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close">Hora cierre *</Label>
                <Input
                  id="close"
                  type="time"
                  value={formState.close_time}
                  onChange={(e) => setFormState({ ...formState, close_time: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !formState.common_area_id}>
                {submitting ? "Guardando..." : editingSchedule ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
