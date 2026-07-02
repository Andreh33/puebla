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
    const footwear = and.find((c) => has(c, '"footwearType"'));
    expect(footwear).toBeDefined();
    // Ahora es un OR: footwearType=padel O categoría m2m *-calzado-padel.
    expect(has(footwear, '"footwearType":{"in":["padel"]}')).toBe(true);
    expect(has(footwear, "-calzado-padel")).toBe(true);
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
    // Bug B: se normaliza a `{ in: [...] }` para soportar padre + descendientes.
    expect(where.categories).toEqual({ some: { categoryId: { in: ["cat_123"] } } });
    // Acepta array (categoría con hijas): preserva todos los ids.
    const multi = buildProductWhere({ categoryId: ["cat_a", "cat_b"], filters: {} });
    expect(multi.categories).toEqual({ some: { categoryId: { in: ["cat_a", "cat_b"] } } });
  });

  it("(e) sin filtros: status ACTIVE, sin OR raíz, y AND solo con el filtro de stock", () => {
    const where = buildProductWhere({ filters: {} });
    expect(where.status).toBe("ACTIVE");
    expect((where as Record<string, unknown>).OR).toBeUndefined();
    // El AND lleva siempre el filtro "con stock" (alguna talla con stock o simple>0).
    const and = where.AND as Record<string, unknown>[];
    expect(Array.isArray(and)).toBe(true);
    expect(and).toHaveLength(1);
    expect(has(and[0], '"sizes":{"some":{"stock":{"gt":0}}}')).toBe(true);
  });
});
