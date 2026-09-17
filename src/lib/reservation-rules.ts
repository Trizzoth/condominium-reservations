/** Zona horaria oficial del negocio (RN-10). */
export const BUSINESS_TIMEZONE = "America/Costa_Rica";
/** Horario fijo de operación (RN-04). */
export const OPEN_HOUR = "07:00";
export const CLOSE_HOUR = "21:00";
/** Horas mínimas antes del inicio para poder cancelar (RN-07). */
export const CANCEL_WINDOW_HOURS = 2;

/**
 * ¿Se puede cancelar? Solo hasta 2h antes del inicio (RN-07).
 * Se evalúa en UI (ocultar botón) y en servidor (Server Action).
 */
export function canCancelReservation(
  startTime: Date | string,
  now: Date = new Date()
): boolean {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  return start.getTime() - now.getTime() >= CANCEL_WINDOW_HOURS * 3600 * 1000;
}
