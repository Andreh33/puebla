import { describe, it, expect } from "vitest";
import { computeDiscount, normalizeCode } from "@/lib/promo/compute";

describe("normalizeCode", () => {
  it("recorta y pasa a mayúsculas", () => {
    expect(normalizeCode("  verano10 ")).toBe("VERANO10");
  });
});

describe("computeDiscount", () => {
  it("PERCENT aplica el porcentaje sobre el bruto (2 decimales)", () => {
    expect(computeDiscount("PERCENT", 10, 60)).toBe(6);
    expect(computeDiscount("PERCENT", 15, 33.33)).toBe(5); // 4.9995 → 5.00
  });
  it("PERCENT acota el valor a 100% (no descuenta más que el total)", () => {
    expect(computeDiscount("PERCENT", 150, 40)).toBe(40);
  });
  it("FIXED descuenta el importe fijo, capado al bruto", () => {
    expect(computeDiscount("FIXED", 5, 60)).toBe(5);
    expect(computeDiscount("FIXED", 80, 60)).toBe(60);
  });
  it("nunca es negativo ni con entradas inválidas", () => {
    expect(computeDiscount("FIXED", -5, 60)).toBe(0);
    expect(computeDiscount("PERCENT", 10, 0)).toBe(0);
    expect(computeDiscount("PERCENT", Number.NaN, 60)).toBe(0);
  });
});
