import { describe, it, expect } from "vitest";
import { buildVariantSku, skuOrFallback, productFamily } from "@/lib/pos/sku";

describe("productFamily", () => {
  it("deriva calzado/textil/accesorio del slug de la categoría principal", () => {
    expect(productFamily("hombre-calzado")).toBe("calzado");
    expect(productFamily("mujer-textil")).toBe("textil");
    expect(productFamily("accesorios")).toBe("accesorio");
    expect(productFamily(null)).toBe("accesorio");
  });
});

describe("buildVariantSku", () => {
  it("calzado: SKU/talla", () => {
    expect(buildVariantSku({ baseSku: "LLO878", size: "40", family: "calzado" })).toBe("LLO878/40");
  });
  it("textil: SKU + letra de talla (sin barra)", () => {
    expect(buildVariantSku({ baseSku: "LLO878", size: "L", family: "textil" })).toBe("LLO878L");
  });
  it("sin talla: SKU base", () => {
    expect(buildVariantSku({ baseSku: "BAL123", size: null, family: "accesorio" })).toBe("BAL123");
    expect(buildVariantSku({ baseSku: "BAL123", size: "", family: "calzado" })).toBe("BAL123");
  });
});

describe("skuOrFallback", () => {
  it("usa sku; si no, modelCode; si no, externalId; si no, id corto en mayúsculas", () => {
    expect(skuOrFallback({ sku: "ABC", modelCode: "M1", externalId: "E1", id: "abcdefghij" })).toBe("ABC");
    expect(skuOrFallback({ sku: null, modelCode: "M1", externalId: "E1", id: "abcdefghij" })).toBe("M1");
    expect(skuOrFallback({ sku: null, modelCode: null, externalId: "E1", id: "abcdefghij" })).toBe("E1");
    expect(skuOrFallback({ sku: null, modelCode: null, externalId: null, id: "abcdefghij" })).toBe("ABCDEFGH");
  });
});
