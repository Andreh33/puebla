import { describe, it, expect } from "vitest";
import { buildProductWhere } from "@/lib/public-queries";

// buildProductWhere es función pura (devuelve el objeto Prisma where, sin BD).
// Estos tests son ESTRUCTURALES: blindan el fix de filtros combinados y los
// cambios del Bloque 3 (footwearType, talla stock-aware, categoría vía pivote).
const has = (obj: unknown, sub: string) => JSON.stringify(obj).includes(sub);

describe("buildProductWhere — filtros combinados + Bloque 3", () => {
  it("(a) negro + talla 40 + Joma: AND de cláusulas independientes, sin OR raíz, talla con stock>0", () => {
    const where = buildProductWhere({ filters: { color: ["negro"], talla: ["40"], marca: ["joma"] } });
    expect(Array.isArray(where.AND)).toBe(true);
    const and = where.AND as Record<string, unknown>[];
    // color en su propio AND (OR-group de colorName contains)
    expect(and.some((c) => has(c, '"colorName"'))).toBe(true);
    // talla: equals "40" Y stock>0 (intersección estricta — no fuga de talla 43)
    const tallaClause = and.find((c) => has(c, '"equals":"40"'));
    expect(tallaClause).toBeDefined();
    expect(has(tallaClause, '"stock":{"gt":0}')).toBe(true);
    // marca top-level (where.brand), no en un OR raíz
    expect(where.brand).toEqual({ is: { slug: { in: ["joma"] } } });
    // NO hay OR raíz que mezcle filtros (el bug histórico)
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });

  it("(b) + tipo=padel: footwearType en el MISMO AND; los 4 filtros en intersección", () => {
    const where = buildProductWhere({ filters: { color: ["negro"], talla: ["40"], marca: ["joma"], tipo: ["padel"] } });
    const and = where.AND as Record<string, unknown>[];
    const footwear = and.find((c) => "footwearType" in c);
    expect(footwear).toEqual({ footwearType: { in: ["padel"] } });
    expect(and.some((c) => has(c, '"colorName"'))).toBe(true);
    expect(and.some((c) => has(c, '"equals":"40"'))).toBe(true);
    expect(where.brand).toBeDefined();
    expect((where as Record<string, unknown>).OR).toBeUndefined();
  });

  it("(c) talla es stock-aware (some incluye size equals + stock>0)", () => {
    const where = buildProductWhere({ filters: { talla: ["42"] } });
    const and = where.AND as Array<{ OR?: Array<{ sizes: { some: { size: unknown; stock: unknown } } }> }>;
    const tallaClause = and.find((c) => Array.isArray(c.OR));
    expect(tallaClause?.OR?.[0]?.sizes.some.stock).toEqual({ gt: 0 });
    expect(tallaClause?.OR?.[0]?.sizes.some.size).toEqual({ equals: "42", mode: "insensitive" });
  });

  it("(d) filtro por categoría usa pivote m2m (categories.some), no categoryId top-level", () => {
    const where = buildProductWhere({ categoryId: "cat_123", filters: {} });
    expect((where as Record<string, unknown>).categoryId).toBeUndefined();
    expect(where.categories).toEqual({ some: { categoryId: "cat_123" } });
  });

  it("(e) sin filtros: where mínimo (status ACTIVE, sin AND)", () => {
    const where = buildProductWhere({ filters: {} });
    expect(where.status).toBe("ACTIVE");
    expect(where.AND).toBeUndefined();
  });
});
