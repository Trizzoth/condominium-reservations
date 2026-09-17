import { describe, it, expect } from "vitest";
import { canCancelReservation, CANCEL_WINDOW_HOURS } from "./reservation-rules";

describe("canCancelReservation (ventana 2h RN-07)", () => {
  const now = new Date("2026-09-16T12:00:00Z");

  it("permite con más de 2h", () => {
    expect(canCancelReservation("2026-09-16T14:00:01Z", now)).toBe(true);
  });

  it("permite justo a las 2h", () => {
    expect(canCancelReservation("2026-09-16T14:00:00Z", now)).toBe(true);
  });

  it("bloquea con menos de 2h", () => {
    expect(canCancelReservation("2026-09-16T13:59:59Z", now)).toBe(false);
  });

  it("bloquea en el pasado", () => {
    expect(canCancelReservation("2026-09-16T11:00:00Z", now)).toBe(false);
  });

  it("acepta Date además de string", () => {
    expect(canCancelReservation(new Date("2026-09-17T12:00:00Z"), now)).toBe(true);
  });

  it("la constante es 2", () => {
    expect(CANCEL_WINDOW_HOURS).toBe(2);
  });
});
