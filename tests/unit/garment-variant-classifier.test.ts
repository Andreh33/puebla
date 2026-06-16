import { describe, it, expect } from "vitest";
import {
  GARMENT_VARIANTS,
  GARMENT_VARIANT_LABELS,
  VARIANT_TO_TYPE,
  inferGarmentVariant,
} from "@/lib/categories/garment";

// Clasificador de variante fina (Bloque 6 §18 paso 3.5.2). Parser por nombre,
// gated por garmentType ∈ {camiseta, pantalon, mallas}. Refinable en 3.5.3.

describe("garment variant — vocabulario", () => {
  it("9 valores + labels + mapeo a tipo completo", () => {
    expect(GARMENT_VARIANTS).toHaveLength(9);
    for (const v of GARMENT_VARIANTS) {
      expect(GARMENT_VARIANT_LABELS[v]).toBeTruthy();
      expect(["camiseta", "pantalon", "mallas"]).toContain(VARIANT_TO_TYPE[v]);
    }
  });
});

describe("inferGarmentVariant — camiseta", () => {
  it("MANGA CORTA → manga_corta (varias escrituras)", () => {
    expect(inferGarmentVariant("CAMISETA MANGA CORTA JOMA MIMETIC", "camiseta")).toBe("manga_corta");
    expect(inferGarmentVariant("CAMISETA M. CORTA NIKE", "camiseta")).toBe("manga_corta");
    expect(inferGarmentVariant("CAMISETAS MANGAS CORTAS", "camiseta")).toBe("manga_corta");
  });
  it("MANGA LARGA → manga_larga", () => {
    expect(inferGarmentVariant("CAMISETA MANGA LARGA ADIDAS", "camiseta")).toBe("manga_larga");
  });
  it("TOP → top", () => {
    expect(inferGarmentVariant("TOP DITCHIL FIRE MOSTAZA", "camiseta")).toBe("top");
  });
  it("TIRANTES / SIN MANGAS → tirantes", () => {
    expect(inferGarmentVariant("CAMISETA TIRANTES MUJER", "camiseta")).toBe("tirantes");
    expect(inferGarmentVariant("CAMISETA SIN MANGAS DITCHIL", "camiseta")).toBe("tirantes");
  });
  it("sin token de variante → null", () => {
    expect(inferGarmentVariant("CAMISETA JOMA OLIMPIADA VERDE", "camiseta")).toBeNull();
  });
  it("POLO con garmentType='polo' → null (polo es tipo propio, sin variante fina)", () => {
    expect(inferGarmentVariant("POLO JOMA CREW V ROJO MARINO 103208.603", "polo")).toBeNull();
  });
});

describe("inferGarmentVariant — pantalon", () => {
  it("CORTO → pantalon_corto (con acento)", () => {
    expect(inferGarmentVariant("PANTALÓN CORTO JOHN SMITH BOFEN", "pantalon")).toBe("pantalon_corto");
  });
  it("LARGO → pantalon_largo", () => {
    expect(inferGarmentVariant("PANTALON LARGO JOMA STAFF", "pantalon")).toBe("pantalon_largo");
  });
  it("sin token de longitud → pantalon_largo por defecto (heurística 3.5.3, exclusión de bermuda)", () => {
    expect(inferGarmentVariant("PANTALON JOMA STAFF 100027", "pantalon")).toBe("pantalon_largo");
  });
});

describe("inferGarmentVariant — mallas", () => {
  it("PIRATA/CAPRI → mallas_piratas", () => {
    expect(inferGarmentVariant("MALLA PIRATA DITCHIL AZUL", "mallas")).toBe("mallas_piratas");
    expect(inferGarmentVariant("MALLAS CAPRI MUJER", "mallas")).toBe("mallas_piratas");
  });
  it("CORTA → mallas_cortas", () => {
    expect(inferGarmentVariant("MALLA CORTA RUNNING", "mallas")).toBe("mallas_cortas");
  });
  it("LARGA / LEGGING → mallas_largas", () => {
    expect(inferGarmentVariant("MALLAS LARGAS DITCHIL", "mallas")).toBe("mallas_largas");
    expect(inferGarmentVariant("LEGGING DITCHIL BIX AZUL COBALTO", "mallas")).toBe("mallas_largas");
  });
  it("sin token (no legging/corta/larga/pirata) → null (NO se asume largas — decisión 3.5.3)", () => {
    expect(inferGarmentVariant("MALLAS JOMA R-CITY MORADO", "mallas")).toBeNull();
  });
});

describe("inferGarmentVariant — gating (no-negociable)", () => {
  it("garmentType null → null siempre", () => {
    expect(inferGarmentVariant("CAMISETA MANGA CORTA", null)).toBeNull();
    expect(inferGarmentVariant("PANTALON CORTO", undefined)).toBeNull();
  });
  it("garmentType fuera de {camiseta,pantalon,mallas} → null aunque el nombre tenga tokens", () => {
    expect(inferGarmentVariant("ABRIGO MANGA CORTA RARO", "abrigo")).toBeNull();
    expect(inferGarmentVariant("BERMUDA SHORT JOMA", "bermuda")).toBeNull();
    expect(inferGarmentVariant("SUDADERA MANGA LARGA", "sudadera")).toBeNull();
  });
});
