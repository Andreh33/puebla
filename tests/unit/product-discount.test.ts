import { describe, it, expect } from "vitest";
import { salePriceFromPercent, percentFromPrices } from "@/lib/products/discount";

describe("salePriceFromPercent", () => {
  it("calcula el precio rebajado desde un %", () => {
    expect(salePriceFromPercent(100, 20)).toBe(80);
    expect(salePriceFromPercent(39.95, 10)).toBe(35.96); // 35.955 → 35.96
  });
  it("null si el % es 0, 100 o fuera de rango (evita 'gratis')", () => {
    expect(salePriceFromPercent(100, 0)).toBeNull();
    expect(salePriceFromPercent(100, 100)).toBeNull();
    expect(salePriceFromPercent(100, -5)).toBeNull();
  });
  it("null si el PVP no es positivo", () => {
    expect(salePriceFromPercent(0, 20)).toBeNull();
  });
});

describe("percentFromPrices", () => {
  it("deriva el % desde PVP y precio rebajado", () => {
    expect(percentFromPrices(100, 80)).toBe(20);
    expect(percentFromPrices(50, 25)).toBe(50);
  });
  it("null si no hay oferta válida (rebajado nulo/≤0/≥PVP)", () => {
    expect(percentFromPrices(100, null)).toBeNull();
    expect(percentFromPrices(100, 0)).toBeNull();
    expect(percentFromPrices(100, 100)).toBeNull();
    expect(percentFromPrices(100, 120)).toBeNull();
  });
});
