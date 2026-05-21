import { describe, it, expect } from "vitest";
import { buildProductWhere } from "@/lib/public-queries";

// Filtro público "Tipo de prenda" (garmentType) — Bloque 6 paso 3a. Función pura.
// Calco del patrón footwearType (?tipo=); aquí ?prenda=. Tests estructurales del where:
// el filtro va en el MISMO array AND (intersección estricta — fix de filtros combinados).
const has = (obj: unknown, sub: string) => JSON.stringify(obj).includes(sub);

describe("buildProductWhere — filtro prenda (garmentType) Bloque 6", () => {
  it("(a) prenda single: garmentType { in: [camiseta] } en el AND, sin OR raíz", () => {
    const where = buildProductWhere({ filters: { prenda: ["camiseta"] } });
    expect(Array.isArray(where.AND)).toBe(true);
    const and = where.AND as Record<string, unknown>[];
    const clause = and.find((c) => "garmentType" in c);
    expect(clause).toEqual({ garmentType: { in: ["camiseta"] } });
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });

  it("(b) prenda multi (CSV): garmentType { in: [camiseta, sudadera] }", () => {
    const where = buildProductWhere({ filters: { prenda: ["camiseta", "sudadera"] } });
    const and = where.AND as Record<string, unknown>[];
    const clause = and.find((c) => "garmentType" in c);
    expect(clause).toEqual({ garmentType: { in: ["camiseta", "sudadera"] } });
  });

  it("(c) prenda + talla: ambos en el MISMO AND, talla stock-aware, sin colisión", () => {
    const where = buildProductWhere({ filters: { prenda: ["camiseta"], talla: ["M"] } });
    const and = where.AND as Record<string, unknown>[];
    expect(and.some((c) => has(c, '"garmentType"'))).toBe(true);
    const tallaClause = and.find((c) => has(c, '"equals":"M"'));
    expect(tallaClause).toBeDefined();
    expect(has(tallaClause, '"stock":{"gt":0}')).toBe(true);
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });

  it("(d) prenda + género: garmentType en AND y gender top-level (intersección)", () => {
    const where = buildProductWhere({ filters: { prenda: ["camiseta"], genero: ["MUJER"] } });
    const and = where.AND as Record<string, unknown>[];
    expect(and.some((c) => has(c, '"garmentType"'))).toBe(true);
    expect(where.gender).toEqual({ in: ["MUJER"] });
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });
});
