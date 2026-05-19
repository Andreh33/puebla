import { describe, it, expect } from "vitest";
import { parsePriceEs, effectivePrice } from "@/lib/price";
import { Decimal } from "decimal.js";

describe("parsePriceEs", () => {
  it("parsea formato español con coma decimal", () => {
    expect(parsePriceEs("21,99")?.toString()).toBe("21.99");
  });

  it("parsea formato anglo con punto decimal", () => {
    expect(parsePriceEs("21.99")?.toString()).toBe("21.99");
  });

  it("parsea separadores de miles europeos", () => {
    expect(parsePriceEs("1.234,56")?.toString()).toBe("1234.56");
  });

  it("parsea separadores de miles anglosajones", () => {
    expect(parsePriceEs("1,234.56")?.toString()).toBe("1234.56");
  });

  it("elimina símbolo de euro y espacios", () => {
    expect(parsePriceEs("21 €")?.toString()).toBe("21");
    expect(parsePriceEs("21,50 EUR")?.toString()).toBe("21.5");
  });

  it("acepta números nativos", () => {
    expect(parsePriceEs(21.5)?.toString()).toBe("21.5");
  });

  it("devuelve null para strings vacíos", () => {
    expect(parsePriceEs("")).toBeNull();
    expect(parsePriceEs("   ")).toBeNull();
  });

  it("devuelve null para null/undefined", () => {
    expect(parsePriceEs(null)).toBeNull();
    expect(parsePriceEs(undefined)).toBeNull();
  });

  it("devuelve null para NaN", () => {
    expect(parsePriceEs(NaN)).toBeNull();
  });

  it("devuelve null para no parseables", () => {
    expect(parsePriceEs("abc")).toBeNull();
    expect(parsePriceEs("12.34.56")).toBeNull();
  });

  it("permite negativos", () => {
    expect(parsePriceEs("-5,00")?.toString()).toBe("-5");
  });
});

describe("effectivePrice", () => {
  it("calcula descuento cuando hay oferta", () => {
    const r = effectivePrice(100, 80);
    expect(r.onSale).toBe(true);
    expect(r.discountPct).toBe(20);
    expect(r.final.toNumber()).toBe(80);
  });

  it("ignora sale si es mayor o igual al retail", () => {
    const r = effectivePrice(100, 100);
    expect(r.onSale).toBe(false);
    expect(r.final.toNumber()).toBe(100);
  });

  it("acepta Decimal como entrada", () => {
    const r = effectivePrice(new Decimal("50"), new Decimal("25"));
    expect(r.discountPct).toBe(50);
  });

  it("sale=null devuelve precio normal", () => {
    const r = effectivePrice(40, null);
    expect(r.onSale).toBe(false);
    expect(r.final.toNumber()).toBe(40);
  });
});
