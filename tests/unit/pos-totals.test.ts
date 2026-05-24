import { describe, it, expect } from "vitest";
import { round2, planTotals } from "@/lib/pos/totals";

describe("round2", () => {
  it("redondea a 2 decimales (half-up)", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(19.99)).toBe(19.99);
  });
});

describe("planTotals (IVA 21% incluido)", () => {
  it("una línea sin descuentos", () => {
    const t = planTotals({ lineSubtotals: [60], totalDiscount: 0 });
    expect(t.total).toBe(60);
    expect(t.tax).toBe(10.41); // 60 - 60/1.21
    expect(t.subtotal).toBe(49.59);
  });
  it("varias líneas con descuento total", () => {
    const t = planTotals({ lineSubtotals: [30, 30], totalDiscount: 10 });
    expect(t.total).toBe(50);
    expect(t.tax).toBe(8.68);
    expect(t.subtotal).toBe(41.32);
  });
  it("nunca devuelve total negativo", () => {
    const t = planTotals({ lineSubtotals: [10], totalDiscount: 999 });
    expect(t.total).toBe(0);
    expect(t.tax).toBe(0);
    expect(t.subtotal).toBe(0);
  });
});
