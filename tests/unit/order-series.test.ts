import { describe, it, expect } from "vitest";
import { pickBucket, buildOrderSeries } from "@/lib/admin/order-series";

describe("pickBucket", () => {
  it("rango corto (≤92 días) → por día", () => {
    expect(pickBucket("2026-06-01", "2026-06-30")).toBe("day");
    expect(pickBucket("2026-04-01", "2026-06-30")).toBe("day"); // ~90 días (presets 30/60/90)
  });
  it("rango medio (≤372 días) → por semana", () => {
    expect(pickBucket("2026-01-01", "2026-06-30")).toBe("week"); // ~180 días
  });
  it("rango largo (>372 días) → por mes", () => {
    expect(pickBucket("2024-01-01", "2026-06-30")).toBe("month");
  });
});

describe("buildOrderSeries — por día", () => {
  it("serie continua, rellena huecos a 0 y agrupa por día", () => {
    const items = [
      { day: "2026-06-10", total: 100 },
      { day: "2026-06-10", total: 50 },
      { day: "2026-06-12", total: 30 },
    ];
    expect(buildOrderSeries(items, "2026-06-10", "2026-06-12")).toEqual([
      { date: "2026-06-10", ingresos: 150, pedidos: 2 },
      { date: "2026-06-11", ingresos: 0, pedidos: 0 },
      { date: "2026-06-12", ingresos: 30, pedidos: 1 },
    ]);
  });
});

describe("buildOrderSeries — por semana", () => {
  it("agrupa por el lunes de cada semana", () => {
    const items = [
      { day: "2026-01-07", total: 100 }, // miércoles → semana del lunes 2026-01-05
      { day: "2026-01-09", total: 50 }, // viernes → misma semana
      { day: "2026-01-14", total: 30 }, // semana del lunes 2026-01-12
    ];
    const s = buildOrderSeries(items, "2026-01-01", "2026-06-30");
    expect(s[0]!.date).toBe("2025-12-29"); // lunes de la semana de 2026-01-01 (jueves)
    expect(s.find((p) => p.date === "2026-01-05")).toEqual({ date: "2026-01-05", ingresos: 150, pedidos: 2 });
    expect(s.find((p) => p.date === "2026-01-12")).toEqual({ date: "2026-01-12", ingresos: 30, pedidos: 1 });
  });
});

describe("buildOrderSeries — por mes", () => {
  it("agrupa por el día 1 de cada mes", () => {
    const items = [
      { day: "2024-03-15", total: 100 },
      { day: "2024-03-20", total: 50 },
      { day: "2024-05-02", total: 30 },
    ];
    const s = buildOrderSeries(items, "2024-01-01", "2026-06-30");
    expect(s[0]!.date).toBe("2024-01-01");
    expect(s.find((p) => p.date === "2024-03-01")).toEqual({ date: "2024-03-01", ingresos: 150, pedidos: 2 });
    expect(s.find((p) => p.date === "2024-05-01")).toEqual({ date: "2024-05-01", ingresos: 30, pedidos: 1 });
  });
});

describe("buildOrderSeries — sin items", () => {
  it("devuelve la rejilla a 0", () => {
    const s = buildOrderSeries([], "2026-06-01", "2026-06-03");
    expect(s).toEqual([
      { date: "2026-06-01", ingresos: 0, pedidos: 0 },
      { date: "2026-06-02", ingresos: 0, pedidos: 0 },
      { date: "2026-06-03", ingresos: 0, pedidos: 0 },
    ]);
  });
});
