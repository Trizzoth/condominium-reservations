"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, AlertCircle, CheckCircle, Loader2, CalendarDays } from "lucide-react";
import { format, startOfDay, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createBrowserClient } from "@supabase/ssr";
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
}

export default function NewReservationPage() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [schedules, setSchedules] = useState<Record<number, { open: string; close: string; maxDuration: number }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
            const scheduleMap: Record<number, { open: string; close: string; maxDuration: number }> = {};
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
  }, []);

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
  const checkAvailability = async (date: Date, startTime: string, endTime: string): Promise<boolean> => {
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
      return;
    }

    const available = await checkAvailability(selectedDate, selectedStartTime, selectedEndTime);
    if (!available) {
      setError("Ese horario ya está reservado. Elige otro.");
      return;
    }

    setSubmitting(true);

    const start = new Date(selectedDate);
    const [sh, sm] = selectedStartTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(selectedDate);
    const [eh, em] = selectedEndTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    const response = await fetch("/api/reservations/create", {
      method: "POST",
      body: new URLSearchParams({
        commonAreaId: selectedArea,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    });

    const result = await response.json();
    setSubmitting(false);
    if (result.error) {
      const err = result.error as { form?: string[] };
      setError(err.form?.[0] || "Error al crear reserva");
    } else {
      setSuccess("Reserva enviada. Espera aprobación del admin.");
      setTimeout(() => router.push("/dashboard/reservations"), 2000);
    }
  };

  const timeSlots = selectedArea && selectedDate ? getTimeSlots(selectedDate) : [];

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  return (
    <DashboardLayout>
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
            {error && (
              <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {success}
              </div>
            )}

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
                {selectedArea && areas.find(a => a.id === selectedArea) && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">Reglas:</p>
                    <p className="text-muted-foreground mt-1">
                      {areas.find(a => a.id === selectedArea)?.rules || "Sin reglas específicas"}
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
                    <p className="text-muted-foreground">Primero selecciona un área para ver disponibilidad</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-3 text-muted-foreground">Cargando horarios...</p>
                  </div>
                ) : Object.keys(schedules).length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No hay horarios configurados para esta área</p>
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
                          <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Hora inicio" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((slot) => (
                                <SelectItem key={slot.time} value={slot.time} disabled={!slot.available}>
                                  {slot.time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Hora fin</Label>
                          <Select value={selectedEndTime} onValueChange={setSelectedEndTime}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Hora fin" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots
                                .filter((slot) => slot.time > selectedStartTime)
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time} disabled={!slot.available}>
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
                            Máx. {schedules[selectedDate.getDay()]?.maxDuration || 4} horas
                          </p>
                          {checkingAvailability && (
                            <p className="text-primary mt-1 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Verificando disponibilidad...
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={submitting || !selectedArea || !selectedDate || !selectedStartTime || !selectedEndTime}>
              {submitting ? "Enviando..." : "Enviar solicitud de reserva"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Las reservas requieren aprobación del administrador.
            </p>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}