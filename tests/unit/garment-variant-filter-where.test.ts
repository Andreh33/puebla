import { describe, it, expect } from "vitest";
import { buildProductWhere, parseCategoryParams } from "@/lib/public-queries";

// Filtro público "Variante de prenda" (garmentVariant) — Bloque 6 §18 paso 3.5.6.
// Cubre la INFERENCIA INVERSA: si hay ?variante= pero no ?prenda=, parseCategoryParams
// infiere la prenda desde VARIANT_TO_TYPE. El filtro va en el MISMO array AND.
const has = (obj: unknown, sub: string) => JSON.stringify(obj).includes(sub);
const whereFrom = (sp: Record<string, string>) => buildProductWhere({ filters: parseCategoryParams(sp) });

describe("buildProductWhere — filtro variante + inferencia inversa (Bloque 6 §18)", () => {
  it("(a) variante single infiere prenda: garmentVariant + garmentType(camiseta) en AND", () => {
    const where = whereFrom({ variante: "manga_corta" });
    const and = where.AND as Record<string, unknown>[];
    expect(and.find((c) => "garmentVariant" in c)).toEqual({ garmentVariant: { in: ["manga_corta"] } });
    expect(and.find((c) => "garmentType" in c)).toEqual({ garmentType: { in: ["camiseta"] } });
  });

  it("(b) variante multi infiere prendas ÚNICAS (dedup: 2 camiseta + 1 pantalon → [camiseta, pantalon])", () => {
    const filters = parseCategoryParams({ variante: "manga_corta,top,pantalon_largo" });
    expect(filters.prenda).toEqual(["camiseta", "pantalon"]);
    const and = buildProductWhere({ filters }).AND as Record<string, unknown>[];
    expect(and.find((c) => "garmentVariant" in c)).toEqual({
      garmentVariant: { in: ["manga_corta", "top", "pantalon_largo"] },
    });
    expect(and.find((c) => "garmentType" in c)).toEqual({ garmentType: { in: ["camiseta", "pantalon"] } });
  });

  it("(c) variante + prenda explícita: respeta la prenda dada (no la sobrescribe)", () => {
    const filters = parseCategoryParams({ prenda: "camiseta", variante: "manga_corta" });
    expect(filters.prenda).toEqual(["camiseta"]);
    const and = buildProductWhere({ filters }).AND as Record<string, unknown>[];
    expect(and.find((c) => "garmentType" in c)).toEqual({ garmentType: { in: ["camiseta"] } });
    expect(and.find((c) => "garmentVariant" in c)).toEqual({ garmentVariant: { in: ["manga_corta"] } });
  });

  it("(d) variante + talla: ambos clauses + prenda inferida, talla stock-aware, sin OR raíz", () => {
    const where = whereFrom({ variante: "manga_corta", talla: "M" });
    const and = where.AND as Record<string, unknown>[];
    expect(and.some((c) => has(c, '"garmentVariant"'))).toBe(true);
    expect(and.some((c) => has(c, '"garmentType"'))).toBe(true);
    const talla = and.find((c) => has(c, '"equals":"M"'));
    expect(has(talla, '"stock":{"gt":0}')).toBe(true);
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });
});
