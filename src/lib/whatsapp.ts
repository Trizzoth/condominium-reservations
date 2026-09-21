/**
 * WhatsApp manual vía wa.me ($0, sin API): abre el chat con el número
 * y texto prellenado. El envío masivo/automático requeriría Twilio o
 * Meta Cloud API (con costo y setup).
 */

/** Normaliza a dígitos internacionales sin "+". CR de 8 dígitos → 506. */
export function toWaNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `506${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** Link wa.me listo para <a target="_blank">, o null si el número no sirve. */
export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const number = toWaNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
