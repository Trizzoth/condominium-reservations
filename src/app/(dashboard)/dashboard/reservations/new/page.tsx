"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, AlertCircle, CheckCircle, Loader2, CalendarDays } from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { es as esDayPicker } from "react-day-picker/locale";
import { createBrowserClient } from "@supabase/ssr";
import { createReservation } from "../actions";
import { createRecurringReservation } from "../actions";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Area {
  id: string;
  name: string;
  capacity: number;
  rules: string;
  min_duration_hours: number | null;
  max_duration_hours: number | null;
  open_hour: string | null;
  close_hour: string | null;
  max_per_week: number | null;
}

export default function NewReservationPage() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [repeatWeeks, setRepeatWeeks] = useState<string>("1");
  const [areas, setAreas] = useState<Area[]>([]);
  const [schedules, setSchedules] = useState<
    Record<number, { open: string; close: string; maxDuration: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const scrollToResult = () => {
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // Fetch areas and schedules on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: areasData } = await supabase
        .from("common_areas")
        .select("*")
        .eq("is_active", true);

      if (areasData) {
        setAreas(areasData);
        for (const area of areasData) {
          const { data: schedData } = await supabase
            .from("availability_schedules")
            .select("*")
            .eq("common_area_id", area.id);
          if (schedData) {
            const scheduleMap: Record<
              number,
              { open: string; close: string; maxDuration: number }
            > = {};
            schedData.forEach((s) => {
              scheduleMap[s.day_of_week] = {
                open: s.open_time,
                close: s.close_time,
                maxDuration: s.max_duration_hours,
              };
            });
            setSchedules((prev) => ({ ...prev, ...scheduleMap }));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // Generate time slots for selected date
  const getTimeSlots = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const schedule = schedules[dayOfWeek];
    if (!schedule) return [];

    const slots: TimeSlot[] = [];
    const [openHour, openMin] = schedule.open.split(":").map(Number);
    const [closeHour, closeMin] = schedule.close.split(":").map(Number);

    let current = new Date(date);
    current.setHours(openHour, openMin, 0, 0);
    const end = new Date(date);
    end.setHours(closeHour, closeMin, 0, 0);

    while (current < end) {
      const next = new Date(current.getTime() + 30 * 60 * 1000);
      if (next <= end) {
        const timeStr = format(current, "HH:mm");
        slots.push({ time: timeStr, available: true });
      }
      current = next;
    }
    return slots;
  };

  // Check real-time availability
  const checkAvailability = async (
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> => {
    if (!selectedArea) return false;
    setCheckingAvailability(true);

    const start = new Date(date);
    const [sh, sm] = startTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(date);
    const [eh, em] = endTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    const { data, error } = await supabase
      .from("reservations")
      .select("id")
      .eq("common_area_id", selectedArea)
      .in("status", ["pending", "approved"])
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());

    setCheckingAvailability(false);
    return !error && (!data || data.length === 0);
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | Date[] | { from: Date; to: Date } | undefined) => {
    if (date && !Array.isArray(date) && !("from" in date)) {
      setSelectedDate(date);
      setSelectedStartTime("");
      setSelectedEndTime("");
    }
  };

  // Get unavailable dates (past dates + dates without schedule)
  const getUnavailableDates = () => {
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = 0; i < 90; i++) {
      const d = addDays(today, i);
      if (!schedules[d.getDay()]) {
        dates.push(d);
      }
    }
    return dates;
  };

  const getDisabledDates = () => {
    const today = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = -365; i < 0; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedArea || !selectedDate || !selectedStartTime || !selectedEndTime) {
      setError("Selecciona área, fecha y hora");
      scrollToResult();
      return;
    }

    const available = await checkAvailability(selectedDate, selectedStartTime, selectedEndTime);
    if (!available) {
      setError("Ese horario ya está reservado. Elige otro.");
      scrollToResult();
      return;
    }

    setSubmitting(true);

    const start = new Date(selectedDate);
    const [sh, sm] = selectedStartTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(selectedDate);
    const [eh, em] = selectedEndTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    // Server Action directa (RULES: sin API Routes para mutaciones).
    const formData = new FormData();
    formData.set("commonAreaId", selectedArea);
    formData.set("startTime", start.toISOString());
    formData.set("endTime", end.toISOString());
    formData.set("weeks", repeatWeeks);

    const result =
      repeatWeeks === "1"
        ? await createReservation(formData)
        : await createRecurringReservation(formData);
    setSubmitting(false);
    if (result.error) {
      const err = result.error as { form?: string[] };
      setError(err.form?.[0] || "Error al crear reserva");
      scrollToResult();
    } else if ("success" in result && typeof result.success === "string") {
      setSuccess(result.success);
      scrollToResult();
      setTimeout(() => router.push("/dashboard/reservations"), 2500);
    }
  };

  const timeSlots = selectedArea && selectedDate ? getTimeSlots(selectedDate) : [];

  // Reglas del área elegida (configurables en /admin/areas; defaults = decisión David).
  const selectedAreaObj = areas.find((a) => a.id === selectedArea);
  const minHours = selectedAreaObj?.min_duration_hours ?? 3;
  const maxHours = selectedAreaObj?.max_duration_hours ?? 6;
  const areaOpen = selectedAreaObj?.open_hour ?? "06:00";
  const areaClose = selectedAreaObj?.close_hour ?? "24:00";
  // Reglas visibles: lo inválido ni se ofrece.
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toCloseMin = (t: string) => (t === "24:00" || t === "00:00" ? 1440 : toMin(t));
  const CLOSE_MIN = toCloseMin(areaClose);
  const startMin = selectedStartTime ? toMin(selectedStartTime) : null;
  const validStartSlots = timeSlots.filter((slot) => {
    // Cabe la duración mínima antes del cierre del área.
    return toMin(slot.time) + minHours * 60 <= CLOSE_MIN;
  });
  const endCandidates =
    startMin === null
      ? []
      : [
          ...timeSlots,
          // Medianoche exacta como fin válido (los slots llegan a 23:30).
          ...(areaClose === "24:00" || areaClose === "00:00"
            ? [{ time: "24:00", available: true }]
            : []),
        ];
  const validEndSlots =
    startMin === null
      ? []
      : endCandidates.filter((slot) => {
          const raw = toMin(slot.time);
          const m = slot.time === "24:00" ? CLOSE_MIN : raw;
          const dur = m - startMin;
          return m > startMin && dur >= minHours * 60 && dur <= maxHours * 60 && slot.available;
        });

  const handleStartChange = (v: string) => {
    setSelectedStartTime(v);
    setSelectedEndTime("");
  };

  const formatDuration = (start: string, end: string) => {
    const diffMin = toMin(end) - toMin(start);
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Nueva reserva
        </h1>
        <p className="text-muted-foreground mt-1">Selecciona área, fecha y hora</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Cargando áreas...</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                1. Elige el área común
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      <div>
                        <p className="font-medium">{area.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Capacidad: {area.capacity} personas
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedArea && areas.find((a) => a.id === selectedArea) && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">Reglas:</p>
                  <p className="text-muted-foreground mt-1">
                    {areas.find((a) => a.id === selectedArea)?.rules || "Sin reglas específicas"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Date with Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                2. Elige la fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedArea ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Primero selecciona un área para ver disponibilidad
                  </p>
                </div>
              ) : loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-3 text-muted-foreground">Cargando horarios...</p>
                </div>
              ) : Object.keys(schedules).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No hay horarios configurados para esta área
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Contacta al administrador</p>
                </div>
              ) : (
                <>
                  <CalendarComponent
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabledDays={getDisabledDates()}
                    unavailableDays={getUnavailableDates()}
                    disableUnavailable={true}
                    locale={esDayPicker}
                  />
                  {selectedDate && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Seleccionado: {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-destructive/10 border border-destructive/20" />
                    <span>Sin horario</span>
                    <span className="w-3 h-3 rounded-full text-muted-foreground/30" />
                    <span>Pasado</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Select Time */}
          {selectedArea && selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  3. Elige la hora
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!schedules[selectedDate.getDay()] ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Este día no tiene horario configurado</p>
                    <p className="text-sm mt-1">Selecciona otro día</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay horarios disponibles para este día</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Hora inicio</Label>
                          <Select value={selectedStartTime} onValueChange={handleStartChange}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Hora inicio" />
                            </SelectTrigger>
                            <SelectContent>
                              {validStartSlots.map((slot) => (
                                <SelectItem
                                  key={slot.time}
                                  value={slot.time}
                                  disabled={!slot.available}
                                >
                                  {slot.time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Hora fin</Label>
                          <Select
                            value={selectedEndTime}
                            onValueChange={setSelectedEndTime}
                            disabled={!selectedStartTime}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder={selectedStartTime ? "Hora fin" : "Elige inicio primero"} />
                            </SelectTrigger>
                            <SelectContent>
                              {validEndSlots.map((slot) => (
                                <SelectItem
                                  key={slot.time}
                                  value={slot.time}
                                  disabled={!slot.available}
                                >
                                  {slot.time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {selectedStartTime && selectedEndTime && (
                        <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                          <p>Duración: {formatDuration(selectedStartTime, selectedEndTime)}</p>
                          <p className="text-muted-foreground">
                            En esta área: de {minHours} a {maxHours} horas, entre {areaOpen} y{" "}
                            {areaClose}
                            {selectedAreaObj?.max_per_week
                              ? ` · máx ${selectedAreaObj.max_per_week}/semana`
                              : ""}
                          </p>
                        {checkingAvailability && (
                          <p className="text-primary mt-1 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Verificando disponibilidad...
                          </p>
                        )}
                      </div>
                    )}
                      {selectedStartTime && !selectedEndTime && validEndSlots.length === 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                          Con esa hora de inicio no hay fin válido ({minHours} a {maxHours} horas
                          dentro de {areaOpen}–{areaClose}). Elige otro inicio.
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: repetición opcional */}
            {selectedArea && selectedDate && selectedStartTime && selectedEndTime && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    4. Repetición (opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>Repetir cada semana, mismo día y hora</Label>
                  <Select value={repeatWeeks} onValueChange={setRepeatWeeks}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Solo esta vez</SelectItem>
                      <SelectItem value="2">2 semanas</SelectItem>
                      <SelectItem value="3">3 semanas</SelectItem>
                      <SelectItem value="4">4 semanas</SelectItem>
                      <SelectItem value="6">6 semanas</SelectItem>
                      <SelectItem value="8">8 semanas</SelectItem>
                    </SelectContent>
                  </Select>
                  {repeatWeeks !== "1" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Se creará una reserva por semana ({repeatWeeks} en total). Las fechas
                      ocupadas se omiten y se te avisan en un solo correo.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Resultado junto a la acción (visible en móvil sin subir) */}
            <div ref={resultRef} className="space-y-3 scroll-mt-4">
              {error && (
                <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" /> {success}
                </div>
              )}
            </div>

            {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              submitting || !selectedArea || !selectedDate || !selectedStartTime || !selectedEndTime
            }
          >
            {submitting ? "Enviando..." : "Enviar solicitud de reserva"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Las reservas requieren aprobación del administrador.
          </p>
        </form>
      )}
    </div>
  );
}
