import { describe, it, expect } from "vitest";
import {
  GARMENT_TYPES,
  GARMENT_TYPE_LABELS,
  inferGarmentType,
  matchByTokenOverride,
  matchByCategory,
  matchByToken,
} from "@/lib/categories/garment";

// Tests del clasificador de tipo de prenda (Bloque 6, paso 1.6). Función pura.
// Diccionarios y cobertura validados con datos crudos de prod (docs/BLOCK-6-PLAN.md §6-§7).

describe("garment — vocabulario", () => {
  it("15 tipos, incluye vestido y chaleco (A1)", () => {
    expect(GARMENT_TYPES).toHaveLength(15);
    expect(GARMENT_TYPES).toContain("vestido");
    expect(GARMENT_TYPES).toContain("chaleco");
  });
  it("todos los tipos tienen label en ES", () => {
    for (const t of GARMENT_TYPES) expect(GARMENT_TYPE_LABELS[t]).toBeTruthy();
  });
});

describe("Pasada 0 — token override (A2)", () => {
  it("VESTIDO/CHALECO (+ plurales) → su tipo; otros tokens → null", () => {
    expect(matchByTokenOverride("VESTIDO JOMA X")).toBe("vestido");
    expect(matchByTokenOverride("VESTIDOS X")).toBe("vestido");
    expect(matchByTokenOverride("CHALECO JOLUVI X")).toBe("chaleco");
    expect(matchByTokenOverride("CAMISETA X")).toBeNull();
  });
});

describe("Pasada 1 — categoría antigua (D4)", () => {
  it("mapea slugs puros; banadores→banador; pantalon-corto→bermuda", () => {
    expect(matchByCategory("camisetas")).toBe("camiseta");
    expect(matchByCategory("chandal")).toBe("chandal");
    expect(matchByCategory("banadores")).toBe("banador");
    expect(matchByCategory("pantalon-corto")).toBe("bermuda");
    expect(matchByCategory("conjuntos")).toBe("conjunto");
  });
  it("slug genérico/desconocido o null → null", () => {
    expect(matchByCategory("hombre")).toBeNull();
    expect(matchByCategory(null)).toBeNull();
    expect(matchByCategory(undefined)).toBeNull();
  });
});

describe("Pasada 2 — token (primer término), tolera acentos y símbolos", () => {
  it("mapea tokens base + A3 (ANORAK/TOP/SOFT)", () => {
    expect(matchByToken("CAMISETA +8000 ASDIS")).toBe("camiseta");
    expect(matchByToken("POLO JOMA")).toBe("camiseta");
    expect(matchByToken("LEGGING JOHN SMITH")).toBe("mallas");
    expect(matchByToken("CHÁNDAL ADIDAS JR")).toBe("chandal"); // acento
    expect(matchByToken("BAÑADOR JOHN SMITH")).toBe("banador"); // ñ
    expect(matchByToken("K-WAY DECATHLON")).toBe("cortavientos"); // símbolo → KWAY
    expect(matchByToken("ANORAK +8000")).toBe("abrigo"); // A3
    expect(matchByToken("TOP NIKE")).toBe("camiseta"); // A3
    expect(matchByToken("SOFT-SHELL JOMA")).toBe("chaqueta"); // A3 → SOFTSHELL
  });
  it("nombre que empieza por marca (no token) → null", () => {
    expect(matchByToken("JHAYBER SET LUMINIX")).toBeNull();
  });
});

describe("inferGarmentType — composición de pasadas", () => {
  it("P0 override gana a P1 (vestido/chaleco dentro de su categoría antigua)", () => {
    expect(inferGarmentType({ categorySlug: "camisetas", name: "VESTIDO JOMA X" })).toBe("vestido");
    expect(inferGarmentType({ categorySlug: "abrigos", name: "CHALECO JOLUVI X" })).toBe("chaleco");
  });
  it("P1 cuando no hay override (categoría pura)", () => {
    expect(inferGarmentType({ categorySlug: "camisetas", name: "CAMISETA +8000 X" })).toBe("camiseta");
  });
  it("P1 gana a P2 (JHAYBER SET en 'conjuntos' → conjunto por categoría)", () => {
    expect(inferGarmentType({ categorySlug: "conjuntos", name: "JHAYBER SET LUMINIX" })).toBe("conjunto");
  });
  it("P2 cuando la categoría es genérica (hombre/mujer)", () => {
    expect(inferGarmentType({ categorySlug: "hombre", name: "BERMUDA JOMA SHORT CRETA" })).toBe("bermuda");
    expect(inferGarmentType({ categorySlug: "mujer", name: "CHAQUETA JOHN SMITH UALAGA" })).toBe("chaqueta");
  });
  it("P3 fuzzy: primer token no casa pero hay token en otra posición", () => {
    expect(inferGarmentType({ categorySlug: "uncategorized", name: "ACTIVE SHORT PACIFIC" })).toBe("bermuda");
  });
  it("NULL legítimo: ropa interior NOPUBLIK (sin token en ningún lado)", () => {
    expect(inferGarmentType({ categorySlug: "mujer", name: "SHORTY NOPUBLIK SEATTLE 2/43/31" })).toBeNull();
    expect(inferGarmentType({ categorySlug: "mujer", name: "SUJETADOR NOPUBLIK SEATTLE CROSS" })).toBeNull();
  });
});
