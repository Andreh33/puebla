import { describe, it, expect } from "vitest";
import { computeProfit, type ProfitLine } from "@/lib/admin/sales-queries";

/**
 * Tests de la función PURA computeProfit (lib/admin/sales-queries.ts).
 *
 * Regla de coste por línea: coste = unitCost ?? product.costPrice ?? 0.
 * - unitCost es el coste CONGELADO en el momento de la venta (preferente).
 * - product.costPrice es el coste ACTUAL del producto (fallback para pedidos
 *   antiguos sin unitCost).
 * Beneficio = Σ (unitPrice − coste) × quantity.
 */

describe("computeProfit", () => {
  it("usa el unitCost congelado cuando está presente", () => {
    const items: ProfitLine[] = [
      // (50 - 30) * 2 = 40
      { unitPrice: 50, unitCost: 30, quantity: 2, product: { costPrice: 99 } },
    ];
    // Ignora costPrice (99) porque hay unitCost congelado.
    expect(computeProfit(items)).toBe(40);
  });

  it("cae a product.costPrice cuando unitCost es null (pedido antiguo)", () => {
    const items: ProfitLine[] = [
      // (50 - 20) * 3 = 90
      { unitPrice: 50, unitCost: null, quantity: 3, product: { costPrice: 20 } },
    ];
    expect(computeProfit(items)).toBe(90);
  });

  it("cae a product.costPrice cuando unitCost es undefined", () => {
    const items: ProfitLine[] = [
      // (10 - 4) * 1 = 6
      { unitPrice: 10, quantity: 1, product: { costPrice: 4 } },
    ];
    expect(computeProfit(items)).toBe(6);
  });

  it("coste = 0 si no hay ni unitCost ni costPrice (margen = precio)", () => {
    const items: ProfitLine[] = [
      { unitPrice: 25, unitCost: null, quantity: 2, product: null },
      { unitPrice: 15, quantity: 1 },
    ];
    // 25*2 + 15*1 = 65
    expect(computeProfit(items)).toBe(65);
  });

  it("suma varias líneas con mezcla de congelado y fallback", () => {
    const items: ProfitLine[] = [
      { unitPrice: 50, unitCost: 30, quantity: 1, product: { costPrice: 10 } }, // 20
      { unitPrice: 40, unitCost: null, quantity: 2, product: { costPrice: 25 } }, // 30
      { unitPrice: 20, quantity: 1 }, // 20 (coste 0)
    ];
    expect(computeProfit(items)).toBe(70);
  });

  it("acepta Decimal-like (toString) en precio y coste", () => {
    const dec = (n: number) => ({ toString: () => String(n) });
    const items: ProfitLine[] = [
      // (19.99 - 9.99) * 2 = 20.00
      { unitPrice: dec(19.99), unitCost: dec(9.99), quantity: 2 },
    ];
    expect(computeProfit(items)).toBe(20);
  });

  it("redondea a 2 decimales", () => {
    const items: ProfitLine[] = [
      // (10.1 - 0.0333) * 3 ≈ 30.2001 → 30.2
      { unitPrice: 10.1, unitCost: 0.0333, quantity: 3 },
    ];
    expect(computeProfit(items)).toBe(30.2);
  });

  it("array vacío → 0", () => {
    expect(computeProfit([])).toBe(0);
  });
});
