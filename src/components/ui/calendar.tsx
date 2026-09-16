"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

interface CalendarProps extends Omit<DayPickerProps, "mode" | "selected" | "onSelect" | "disabled"> {
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (date: Date | Date[] | { from: Date; to: Date } | undefined) => void;
  disabledDays?: Date[];
  unavailableDays?: Date[];
  className?: string;
  disableUnavailable?: boolean;
}

function isDateInArray(date: Date, dates: Date[]): boolean {
  return dates.some((d) => d.toDateString() === date.toDateString());
}

export function Calendar({
  selected,
  onSelect,
  disabledDays = [],
  unavailableDays = [],
  className,
  disableUnavailable = true,
  ...props
}: CalendarProps) {
  const allDisabledDays = [
    ...disabledDays,
    ...(disableUnavailable ? unavailableDays : []),
  ];

  const disabled = (date: Date) => isDateInArray(date, allDisabledDays);

  const isUnavailableDate = (date: Date) => isDateInArray(date, unavailableDays);

  return (
    <DayPicker
      mode="single"
      selected={selected as Date | undefined}
      onSelect={onSelect}
      disabled={disabled}
      classNames={{
        root: cn("p-2", className),
        month: "space-y-2",
        month_caption: "flex items-center justify-between",
        nav: "flex items-center gap-1",
        button_previous: "p-1 rounded hover:bg-accent transition-colors",
        button_next: "p-1 rounded hover:bg-accent transition-colors",
        weekdays: "flex",
        weekday: "text-xs font-medium text-muted-foreground w-10 text-center",
        week_number: "text-xs text-muted-foreground w-10 text-center",
        day: "relative flex h-10 w-10 items-center justify-center text-sm font-medium rounded-full",
        day_button: "h-full w-full rounded-full hover:bg-accent focus:bg-accent focus:outline-none transition-colors",
        selected: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
        range_start: "bg-primary text-primary-foreground rounded-l-full",
        range_end: "bg-primary text-primary-foreground rounded-r-full",
        range_middle: "bg-primary/20 text-primary",
        outside: "text-muted-foreground/50 pointer-events-none",
        disabled: "text-muted-foreground/30 cursor-not-allowed opacity-50",
      }}
      components={{
        // NOTA: en DayPicker v9 el click vive en DayButton, no en Day.
        // Sobrescribir Day rompía la selección; DayButton conserva el onClick interno.
        DayButton: ({ day, modifiers, ...rest }) => {
          const date = day.date;
          const isUnavail = isDateInArray(date, unavailableDays);

          return (
            <button
              type="button"
              {...rest}
              className={cn(
                "h-full w-full rounded-full hover:bg-accent focus:bg-accent focus:outline-none transition-colors",
                isUnavail && "bg-destructive/10 text-destructive border border-destructive/20 cursor-not-allowed opacity-60",
                modifiers.disabled && "text-muted-foreground/30 cursor-not-allowed opacity-50",
                modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
                modifiers.range_start && "bg-primary text-primary-foreground rounded-l-full",
                modifiers.range_end && "bg-primary text-primary-foreground rounded-r-full",
                modifiers.range_middle && "bg-primary/20 text-primary",
              )}
              disabled={rest.disabled || isUnavail}
              aria-label={`Día ${day.date.getDate()}${modifiers.disabled ? ", deshabilitado" : ""}${isUnavail ? ", sin horario disponible" : ""}`}
            >
              {day.date.getDate()}
            </button>
          );
        },
      }}
      {...props}
    />
  );
}

export function CalendarWithLegend({
  unavailableDays = [],
  disabledDays = [],
}: { unavailableDays?: Date[]; disabledDays?: Date[] }) {
  return (
    <div className="space-y-4">
      <Calendar unavailableDays={unavailableDays} disabledDays={disabledDays} />
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-destructive/10 border border-destructive/20" />
          <span>Sin horario / No disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full text-muted-foreground/30" />
          <span>Pasado / Deshabilitado</span>
        </div>
      </div>
    </div>
  );
}