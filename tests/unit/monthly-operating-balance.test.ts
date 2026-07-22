import { describe, expect, it } from "vitest";

import {
  calculateMonthlyOperatingBalance,
  nextMonthPeriod,
} from "@/lib/admin/monthly-operating-balance";

describe("nextMonthPeriod", () => {
  it("avanza el mes y cruza correctamente el cambio de año", () => {
    expect(nextMonthPeriod("2026-07")).toBe("2026-08");
    expect(nextMonthPeriod("2026-12")).toBe("2027-01");
  });
});

describe("calculateMonthlyOperatingBalance", () => {
  it("marca positivo cuando las ventas superan las facturas", () => {
    expect(calculateMonthlyOperatingBalance(1_250, 800)).toEqual({
      sales: 1_250,
      supplierInvoices: 800,
      difference: 450,
      state: "positive",
    });
  });

  it("marca negativo cuando las facturas superan las ventas", () => {
    expect(calculateMonthlyOperatingBalance(400, 725.5)).toEqual({
      sales: 400,
      supplierInvoices: 725.5,
      difference: -325.5,
      state: "negative",
    });
  });

  it("distingue equilibrio con movimiento de un mes vacío", () => {
    expect(calculateMonthlyOperatingBalance(500, 500).state).toBe("balanced");
    expect(calculateMonthlyOperatingBalance(0, 0).state).toBe("empty");
  });

  it("redondea importes a céntimos y neutraliza valores no finitos", () => {
    expect(calculateMonthlyOperatingBalance(100.105, 40.101)).toMatchObject({
      sales: 100.11,
      supplierInvoices: 40.1,
      difference: 60.01,
    });
    expect(calculateMonthlyOperatingBalance(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      sales: 0,
      supplierInvoices: 0,
      difference: 0,
      state: "empty",
    });
  });
});
