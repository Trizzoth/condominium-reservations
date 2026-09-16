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
  ...props
}: CalendarProps) {
  const disabled = (date: Date) => isDateInArray(date, disabledDays);

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
        button_previous: "p-1 rounded hover:bg-accent",
        button_next: "p-1 rounded hover:bg-accent",
        weekdays: "flex",
        weekday: "text-xs font-medium text-muted-foreground w-10 text-center",
        week_number: "text-xs text-muted-foreground w-10 text-center",
        day: "relative flex h-10 w-10 items-center justify-center text-sm font-medium rounded-full",
        day_button: "h-full w-full rounded-full hover:bg-accent focus:bg-accent focus:outline-none",
        selected: "bg-primary text-primary-foreground hover:bg-primary/90",
        range_start: "bg-primary text-primary-foreground rounded-l-full",
        range_end: "bg-primary text-primary-foreground rounded-r-full",
        range_middle: "bg-primary/20 text-primary",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/30 cursor-not-allowed",
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
          <span>No disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full text-muted-foreground/30" />
          <span>Pasado / Deshabilitado</span>
        </div>
      </div>
    </div>
  );
}