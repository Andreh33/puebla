import { describe, it, expect } from "vitest";
import { buildPaymentBreakdown } from "@/lib/admin/payment-breakdown";

function order(total: number, paymentMethod: string | null, deliveryMethod: string | null) {
  return { total, paymentMethod, deliveryMethod };
}

describe("buildPaymentBreakdown", () => {
  it("agrupa por método, suma pedidos/importe y calcula %", () => {
    const rows = buildPaymentBreakdown([
      order(100, "card", "shipping"),
      order(50, "card", "shipping"),
      order(30, "bizum", "shipping"),
      order(20, "paypal", "pickup"),
      order(100, null, "in_store"), // TPV
      order(40, null, "shipping"), // online sin método
      order(60, "klarna", "shipping"), // Klarna: método conocido, cubo propio
    ]);
    // total importe = 400
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["Tarjeta"]).toMatchObject({ pedidos: 2, importe: 150, pct: 37.5 });
    expect(byLabel["Bizum"]).toMatchObject({ pedidos: 1, importe: 30, pct: 7.5 });
    expect(byLabel["PayPal"]).toMatchObject({ pedidos: 1, importe: 20, pct: 5 });
    expect(byLabel["Klarna"]).toMatchObject({ pedidos: 1, importe: 60, pct: 15 });
    expect(byLabel["TPV"]).toMatchObject({ pedidos: 1, importe: 100, pct: 25 });
    // Solo el online SIN método capturado cae en el cubo residual.
    expect(byLabel["Online (sin especificar)"]).toMatchObject({
      pedidos: 1,
      importe: 40,
      pct: 10,
    });
    // los % suman ~100
    expect(Math.round(rows.reduce((a, r) => a + r.pct, 0))).toBe(100);
  });

  it("ordena por importe descendente", () => {
    const rows = buildPaymentBreakdown([
      order(10, "bizum", "shipping"),
      order(100, "card", "shipping"),
      order(50, null, "in_store"),
    ]);
    expect(rows.map((r) => r.label)).toEqual(["Tarjeta", "TPV", "Bizum"]);
  });

  it("lista vacía → []", () => {
    expect(buildPaymentBreakdown([])).toEqual([]);
  });

  it("importe total 0 → pct 0 sin NaN", () => {
    const rows = buildPaymentBreakdown([order(0, "card", "shipping")]);
    expect(rows[0]?.pct).toBe(0);
    expect(Number.isNaN(rows[0]?.pct)).toBe(false);
  });
});
