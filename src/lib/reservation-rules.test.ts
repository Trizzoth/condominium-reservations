import { describe, it, expect } from "vitest";
import { canCancelReservation, CANCEL_WINDOW_HOURS } from "./reservation-rules";

describe("canCancelReservation (ventana 4h IDEA)", () => {
  const now = new Date("2026-09-16T12:00:00Z");

  it("permite con más de 4h", () => {
    expect(canCancelReservation("2026-09-16T16:00:01Z", now)).toBe(true);
  });

  it("permite justo a las 4h", () => {
    expect(canCancelReservation("2026-09-16T16:00:00Z", now)).toBe(true);
  });

  it("bloquea con menos de 4h", () => {
    expect(canCancelReservation("2026-09-16T15:59:59Z", now)).toBe(false);
  });

  it("bloquea en el pasado", () => {
    expect(canCancelReservation("2026-09-16T11:00:00Z", now)).toBe(false);
  });

  it("acepta Date además de string", () => {
    expect(canCancelReservation(new Date("2026-09-17T12:00:00Z"), now)).toBe(true);
  });

  it("la constante es 4", () => {
    expect(CANCEL_WINDOW_HOURS).toBe(4);
  });
});
