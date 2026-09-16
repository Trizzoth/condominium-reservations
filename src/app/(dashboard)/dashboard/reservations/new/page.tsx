"use client";

import { useState } from "react";
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
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isBefore, isAfter, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createBrowserClient } from "@supabase/ssr";

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function NewReservationPage() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [areas, setAreas] = useState<Array<{ id: string; name: string; capacity: number; rules: string }>>([]);
  const [schedules, setSchedules] = useState<Record<number, { open: string; close: string; maxDuration: number }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  // Calcular slots de tiempo basado en horarios
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

  // Fetch areas and schedules
  const fetchData = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: areasData } = await supabase
      .from("common_areas")
      .select("*")
      .eq("is_active", true);

    if (areasData) {
      setAreas(areasData);
      // Fetch schedules for all areas
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

  // Check availability for selected slot
  const checkAvailability = async () => {
    if (!selectedArea || !selectedStartTime || !selectedEndTime) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const start = new Date(selectedDate);
    const [sh, sm] = selectedStartTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(selectedDate);
    const [eh, em] = selectedEndTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    const { data, error } = await supabase
      .from("reservations")
      .select("id")
      .eq("common_area_id", selectedArea)
      .in("status", ["pending", "approved"])
      .lt("start_time", end.toISOString())
      .gt("end_time", start.toISOString());

    return !error && (!data || data.length === 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedArea || !selectedStartTime || !selectedEndTime) {
      setError("Selecciona área, fecha y hora");
      return;
    }

    const available = await checkAvailability();
    if (!available) {
      setError("Ese horario ya está reservado. Elige otro.");
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const start = new Date(selectedDate);
    const [sh, sm] = selectedStartTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(selectedDate);
    const [eh, em] = selectedEndTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    const { error } = await supabase.from("reservations").insert({
      common_area_id: selectedArea,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Reserva enviada. Espera aprobación del admin.");
      setTimeout(() => router.push("/dashboard/reservations"), 2000);
    }
  };

  // Calendar helpers
  const monthStart = startOfWeek(startOfMonth(viewMonth), { locale: es });
  const monthEnd = endOfWeek(endOfMonth(viewMonth), { locale: es });
  const days: Date[] = [];
  let day = monthStart;
  while (day <= monthEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const isPast = (date: Date) => isBefore(date, startOfDay(new Date()));
  const startOfDay = (d: Date) => { const nd = new Date(d); nd.setHours(0,0,0,0); return nd; };

  const timeSlots = selectedArea ? getTimeSlots(selectedDate) : [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva reserva</h1>
          <p className="text-muted-foreground mt-1">Selecciona área, fecha y hora</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
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
                <CardTitle>1. Elige el área común</CardTitle>
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

            {/* Step 2: Select Date */}
            <Card>
              <CardHeader>
                <CardTitle>2. Elige la fecha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                      disabled={isBefore(viewMonth, startOfMonth(new Date()))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-medium capitalize">
                      {format(viewMonth, "MMMM yyyy", { locale: es })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                      <div key={d} className="text-center text-xs text-muted-foreground py-1">
                        {d}
                      </div>
                    ))}
                    {days.map((d) => {
                      const isCurrentMonth = d.getMonth() === viewMonth.getMonth();
                      const isSelected = isSameDay(d, selectedDate);
                      const isPastDay = isPast(d);
                      const hasSchedule = schedules[d.getDay()];

                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          onClick={() => {
                            if (!isPastDay && hasSchedule && isCurrentMonth) {
                              setSelectedDate(d);
                              setSelectedStartTime("");
                              setSelectedEndTime("");
                            }
                          }}
                          disabled={isPastDay || !hasSchedule || !isCurrentMonth}
                          className={`
                            aspect-square rounded-lg text-sm font-medium transition-all
                            ${isSelected ? "bg-primary text-primary-foreground" : ""}
                            ${isPastDay || !hasSchedule || !isCurrentMonth
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "hover:bg-accent hover:text-accent-foreground"}
                            ${!isCurrentMonth ? "opacity-50" : ""}
                          `}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <p className="text-sm text-muted-foreground">
                      Seleccionado: {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Select Time */}
            {selectedArea && selectedDate && schedules[selectedDate.getDay()] && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Elige la hora</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <p>Duración: {format(new Date(`2000-01-01T${selectedEndTime}`), "HH:mm", { locale: es })} - {format(new Date(`2000-01-01T${selectedStartTime}`), "HH:mm", { locale: es })}</p>
                      <p className="text-muted-foreground">
                        Máx. {schedules[selectedDate.getDay()]?.maxDuration || 4} horas
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={submitting || !selectedArea || !selectedStartTime || !selectedEndTime}>
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