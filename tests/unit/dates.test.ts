import { describe, it, expect } from "vitest";
import { madridDayStart, madridDayEnd } from "@/lib/dates";

/**
 * Verifica la conversión pared-horaria Madrid → instante UTC en verano (CEST,
 * UTC+2) e invierno (CET, UTC+1). El servidor corre en UTC; sin esto los límites
 * de día/mes se desplazarían y misatribuirían pedidos de la franja de medianoche.
 */
describe("madridDayStart / madridDayEnd (DST-aware)", () => {
  it("verano (CEST, UTC+2): 1 ago 00:00 Madrid = 31 jul 22:00 UTC", () => {
    expect(madridDayStart("2026-08-01").toISOString()).toBe("2026-07-31T22:00:00.000Z");
  });
  it("verano: fin de 31 ago 23:59:59.999 Madrid = 31 ago 21:59:59.999 UTC", () => {
    expect(madridDayEnd("2026-08-31").toISOString()).toBe("2026-08-31T21:59:59.999Z");
  });
  it("invierno (CET, UTC+1): 1 ene 00:00 Madrid = 31 dic 23:00 UTC", () => {
    expect(madridDayStart("2026-01-01").toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });
  it("invierno: fin de 15 ene 23:59:59.999 Madrid = 15 ene 22:59:59.999 UTC", () => {
    expect(madridDayEnd("2026-01-15").toISOString()).toBe("2026-01-15T22:59:59.999Z");
  });
});
