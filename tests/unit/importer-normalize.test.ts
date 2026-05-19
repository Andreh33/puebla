/**
 * Tests unitarios para los normalizadores del importador PRICAT.
 * Solo lógica pura: no toca BD, no toca el filesystem.
 */

import { describe, it, expect } from "vitest";
import {
  titleCaseEs,
  normalizeCode,
  normalizeSize,
  mapStatus,
  mapGender,
  normalizeEan,
  composeProductName,
  normalizePricatRow,
  parsePrice,
} from "@/lib/importer/normalize";

// ---------------------------------------------------------------------------
// titleCaseEs
// ---------------------------------------------------------------------------

describe("titleCaseEs", () => {
  it("convierte mayúsculas planas en Title Case", () => {
    expect(titleCaseEs("MOCHILA")).toBe("Mochila");
    expect(titleCaseEs("JOHN SMITH")).toBe("John Smith");
    expect(titleCaseEs("AZUL MARINO")).toBe("Azul Marino");
  });

  it("respeta stopwords castellanas en minúscula", () => {
    expect(titleCaseEs("ROPA DE MONTAÑA")).toBe("Ropa de Montaña");
    expect(titleCaseEs("ZAPATILLAS DE LA MARCA")).toBe("Zapatillas de la Marca");
  });

  it("mantiene la primera palabra capitalizada aunque sea stopword", () => {
    expect(titleCaseEs("DE PRUEBA")).toBe("De Prueba");
  });

  it("respeta separadores especiales (barra, guion, paréntesis)", () => {
    expect(titleCaseEs("TIEMPO LIBRE/CASUAL")).toBe("Tiempo Libre/Casual");
    expect(titleCaseEs("MASCULINO (SR.)")).toBe("Masculino (Sr.)");
    expect(titleCaseEs("POLI-COTTON")).toBe("Poli-Cotton");
  });

  it("trata vacíos y nulos como cadena vacía", () => {
    expect(titleCaseEs(null)).toBe("");
    expect(titleCaseEs(undefined)).toBe("");
    expect(titleCaseEs("  ")).toBe("");
  });

  it("acepta números", () => {
    expect(titleCaseEs(42)).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// normalizeCode
// ---------------------------------------------------------------------------

describe("normalizeCode", () => {
  it("recorta y eleva a mayúsculas", () => {
    expect(normalizeCode(" m24205 ")).toBe("M24205");
    expect(normalizeCode("cf49004000")).toBe("CF49004000");
  });

  it("vacíos → ''", () => {
    expect(normalizeCode(null)).toBe("");
    expect(normalizeCode("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizeSize
// ---------------------------------------------------------------------------

describe("normalizeSize", () => {
  it("trata UNICA/ÚNICA/U/UNIDAD como producto sin tallas", () => {
    expect(normalizeSize("UNICA")).toBe("");
    expect(normalizeSize("única")).toBe("");
    expect(normalizeSize("u")).toBe("");
    expect(normalizeSize("UNIDAD")).toBe("");
  });

  it("preserva tallas normales en mayúsculas", () => {
    expect(normalizeSize("m")).toBe("M");
    expect(normalizeSize("42")).toBe("42");
    expect(normalizeSize("xs")).toBe("XS");
    expect(normalizeSize("3,5")).toBe("3,5");
  });

  it("vacíos → ''", () => {
    expect(normalizeSize(null)).toBe("");
    expect(normalizeSize("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// mapStatus
// ---------------------------------------------------------------------------

describe("mapStatus", () => {
  it("'A' → defaultStatus (DRAFT por defecto)", () => {
    expect(mapStatus("A")).toBe("DRAFT");
    expect(mapStatus("a")).toBe("DRAFT");
    expect(mapStatus("ALTA")).toBe("DRAFT");
    expect(mapStatus("A", "ACTIVE")).toBe("ACTIVE");
  });

  it("'B' → INACTIVE siempre", () => {
    expect(mapStatus("B")).toBe("INACTIVE");
    expect(mapStatus("BAJA")).toBe("INACTIVE");
    expect(mapStatus("b", "ACTIVE")).toBe("INACTIVE");
  });

  it("valores desconocidos → defaultStatus", () => {
    expect(mapStatus("X")).toBe("DRAFT");
    expect(mapStatus(null)).toBe("DRAFT");
    expect(mapStatus(undefined, "ACTIVE")).toBe("ACTIVE");
  });
});

// ---------------------------------------------------------------------------
// mapGender
// ---------------------------------------------------------------------------

describe("mapGender", () => {
  it("mapea perfiles oficiales del PRICAT", () => {
    expect(mapGender("MASCULINO (SR.)")).toBe("HOMBRE");
    expect(mapGender("FEMENINO (SRA.)")).toBe("MUJER");
    expect(mapGender("JUNIOR NIÑO (JR.)")).toBe("NINO");
    expect(mapGender("JUNIOR NIÑA (JR.)")).toBe("NINA");
    expect(mapGender("UNISEX (SR.-SRA.)")).toBe("UNISEX");
    expect(mapGender("UNISEX (JR. NIÑO-NIÑA)")).toBe("UNISEX");
    expect(mapGender("UNISEX (BEBE-INFANTIL)")).toBe("BEBE");
  });

  it("acepta variantes sin tildes y en minúsculas", () => {
    expect(mapGender("masculino (sr.)")).toBe("HOMBRE");
    expect(mapGender("unisex (jr. nino-nina)")).toBe("UNISEX");
    expect(mapGender("unisex (bebé-infantil)")).toBe("BEBE");
  });

  it("vacío o desconocido → NO_ESPECIFICADO", () => {
    expect(mapGender(null)).toBe("NO_ESPECIFICADO");
    expect(mapGender("OTRO")).toBe("NO_ESPECIFICADO");
    expect(mapGender("")).toBe("NO_ESPECIFICADO");
  });
});

// ---------------------------------------------------------------------------
// normalizeEan
// ---------------------------------------------------------------------------

describe("normalizeEan", () => {
  it("acepta EAN-13 válido", () => {
    expect(normalizeEan("8445402577408")).toBe("8445402577408");
  });

  it("acepta EAN-8 a EAN-14", () => {
    expect(normalizeEan("12345678")).toBe("12345678");
    expect(normalizeEan("12345678901234")).toBe("12345678901234");
  });

  it("rechaza con letras o longitudes fuera de rango", () => {
    expect(normalizeEan("ABC123")).toBeNull();
    expect(normalizeEan("1234567")).toBeNull(); // 7 dígitos
    expect(normalizeEan("123456789012345")).toBeNull(); // 15 dígitos
    expect(normalizeEan(null)).toBeNull();
    expect(normalizeEan("")).toBeNull();
  });

  it("recorta espacios", () => {
    expect(normalizeEan("  8445402577408  ")).toBe("8445402577408");
  });
});

// ---------------------------------------------------------------------------
// parsePrice (re-export de parsePriceEs)
// ---------------------------------------------------------------------------

describe("parsePrice", () => {
  it("acepta formato europeo con coma decimal", () => {
    expect(parsePrice("21,99")?.toString()).toBe("21.99");
    expect(parsePrice("1.234,56")?.toString()).toBe("1234.56");
  });

  it("acepta formato anglosajón con punto", () => {
    expect(parsePrice("21.99")?.toString()).toBe("21.99");
  });

  it("acepta números directos", () => {
    expect(parsePrice(21.99)?.toString()).toBe("21.99");
  });

  it("rechaza basura y vacíos", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// composeProductName
// ---------------------------------------------------------------------------

describe("composeProductName", () => {
  it("compone el nombre canónico del producto", () => {
    expect(
      composeProductName({
        tipo: "MOCHILA",
        marca: "JOHN SMITH",
        modelo: "M24205",
        color: "AZUL MARINO",
      }),
    ).toBe("Mochila John Smith M24205 Azul Marino");
  });

  it("omite partes vacías y compacta espacios", () => {
    expect(
      composeProductName({
        tipo: "",
        marca: "JOHN SMITH",
        modelo: "X1",
        color: "ROJO",
      }),
    ).toBe("John Smith X1 Rojo");
  });
});

// ---------------------------------------------------------------------------
// normalizePricatRow (integración de mapeos)
// ---------------------------------------------------------------------------

describe("normalizePricatRow", () => {
  const baseRaw = {
    rowNumber: 2,
    altaBaja: "A",
    modelo: "M24205",
    codigoModelo: "CF49004000",
    descripcionModelo: "M24205 AZUL MARINO",
    tipo: "MOCHILA",
    usoDeportivo: "TIEMPO LIBRE/CASUAL",
    marca: "JOHN SMITH",
    codigoArticulo: "030501",
    codColor: "004000",
    color: "AZUL MARINO",
    talla: "UNICA",
    perfil: "UNISEX (SR.-SRA.)",
    composicion: "POLIESTER 100%",
    tarifa: "10,65",
    pvp: "21,99",
    ean: "8445402577408",
  } as const;

  it("normaliza una fila de muestra del PRICAT", () => {
    const r = normalizePricatRow(baseRaw);
    expect(r.modelCode).toBe("M24205");
    expect(r.modelArticleCode).toBe("030501");
    expect(r.colorCode).toBe("004000");
    expect(r.productKey).toBe("M24205-004000");
    expect(r.externalId).toBe("pricat:M24205-004000");
    expect(r.brand).toBe("John Smith");
    expect(r.type).toBe("Mochila");
    expect(r.sportUse).toBe("Tiempo Libre/Casual");
    expect(r.colorName).toBe("Azul Marino");
    expect(r.size).toBe(""); // UNICA → vacío
    expect(r.gender).toBe("UNISEX");
    expect(r.composition).toBe("Poliester 100%");
    expect(r.status).toBe("DRAFT");
    expect(r.costPrice?.toString()).toBe("10.65");
    expect(r.retailPrice?.toString()).toBe("21.99");
    expect(r.ean).toBe("8445402577408");
    expect(r.name).toBe("Mochila John Smith M24205 Azul Marino");
  });

  it("una fila 'B' (baja) marca status INACTIVE", () => {
    const r = normalizePricatRow({ ...baseRaw, altaBaja: "B" });
    expect(r.status).toBe("INACTIVE");
  });

  it("una talla concreta (no UNICA) se preserva", () => {
    const r = normalizePricatRow({ ...baseRaw, talla: "M" });
    expect(r.size).toBe("M");
  });

  it("perfil JUNIOR NIÑO → gender NINO", () => {
    const r = normalizePricatRow({ ...baseRaw, perfil: "JUNIOR NIÑO (JR.)" });
    expect(r.gender).toBe("NINO");
  });

  it("EAN inválido se anula a null sin romper la fila", () => {
    const r = normalizePricatRow({ ...baseRaw, ean: "no-es-un-ean" });
    expect(r.ean).toBeNull();
  });

  it("falta 'modelo' → lanza error", () => {
    expect(() => normalizePricatRow({ ...baseRaw, modelo: "" })).toThrow(/modelo/i);
  });

  it("falta 'código artículo' → lanza error", () => {
    expect(() => normalizePricatRow({ ...baseRaw, codigoArticulo: "" })).toThrow(
      /código artículo/i,
    );
  });

  it("productKey cae a sólo modelo si falta Cód.color", () => {
    const r = normalizePricatRow({ ...baseRaw, codColor: "" });
    expect(r.productKey).toBe("M24205");
    expect(r.externalId).toBe("pricat:M24205");
  });
});
