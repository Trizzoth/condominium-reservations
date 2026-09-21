/** Zona horaria oficial del negocio (RN-10). */
export const BUSINESS_TIMEZONE = "America/Costa_Rica";
/** Horario fijo de operación (decisión David: 06:00–24:00). */
export const OPEN_HOUR = "06:00";
export const CLOSE_HOUR = "24:00";
/** Horas mínimas antes del inicio para poder cancelar (RN-07). */
export const CANCEL_WINDOW_HOURS = 2;

/**
 * ¿Se puede cancelar? Solo hasta N horas antes del inicio (RN-07).
 * La ventana se lee de app_settings; por defecto 2h (valor histórico).
 * Se evalúa en UI (ocultar botón) y en servidor (Server Action).
 */
export function canCancelReservation(
  startTime: Date | string,
  now: Date = new Date(),
  windowHours: number = CANCEL_WINDOW_HOURS,
): boolean {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  return start.getTime() - now.getTime() >= windowHours * 3600 * 1000;
}
