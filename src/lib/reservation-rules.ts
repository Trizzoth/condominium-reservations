/** Horas mínimas antes del inicio para poder cancelar (regla IDEA). */
export const CANCEL_WINDOW_HOURS = 4;

/**
 * ¿Se puede cancelar? Solo si faltan 4h o más para el inicio.
 * Se evalúa en UI (ocultar botón) y en servidor (Server Action).
 */
export function canCancelReservation(
  startTime: Date | string,
  now: Date = new Date()
): boolean {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  return start.getTime() - now.getTime() >= CANCEL_WINDOW_HOURS * 3600 * 1000;
}
