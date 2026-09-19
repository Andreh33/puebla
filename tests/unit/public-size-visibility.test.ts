import { describe, expect, it } from "vitest";
import {
  isPublicSizeVisible,
  publicSizeStock,
  publicStoreSectionFromGender,
} from "@/lib/products/public-size-visibility";

describe("visibilidad pública de tallas", () => {
  it("oculta únicamente las tallas de calzado indicadas para cada sección", () => {
    expect(isPublicSizeVisible("hombre", "calzado", "42.5")).toBe(false);
    expect(isPublicSizeVisible("hombre", "calzado", "44.5")).toBe(false);
    expect(isPublicSizeVisible("hombre", "calzado", "43\\")).toBe(false);
    expect(isPublicSizeVisible("hombre", "calzado", "48/")).toBe(false);
    expect(isPublicSizeVisible("nino", "calzado", "37/")).toBe(false);
    expect(isPublicSizeVisible("nino", "calzado", "38\\")).toBe(false);
    expect(isPublicSizeVisible("nina", "calzado", "37\\")).toBe(false);
    expect(isPublicSizeVisible("mujer", "calzado", "37/")).toBe(false);
    expect(isPublicSizeVisible("mujer", "calzado", "38\\")).toBe(false);
  });

  it("conserva las variantes correctas con coma y las tallas de otras secciones", () => {
    expect(isPublicSizeVisible("hombre", "calzado", "42,5")).toBe(true);
    expect(isPublicSizeVisible("hombre", "calzado", "44,5")).toBe(true);
    expect(isPublicSizeVisible("nina", "calzado", "38\\")).toBe(true);
    expect(isPublicSizeVisible("mujer", "calzado", "42.5")).toBe(true);
  });

  it("no altera ninguna talla de ropa", () => {
    expect(isPublicSizeVisible("hombre", "textil", "42.5")).toBe(true);
    expect(isPublicSizeVisible("mujer", "textil", "38\\")).toBe(true);
  });

  it("anula el stock público de una variante oculta sin tocar el valor original", () => {
    expect(publicSizeStock("hombre", "calzado", "42.5", 3)).toBe(0);
    expect(publicSizeStock("hombre", "calzado", "42,5", 3)).toBe(3);
    expect(publicSizeStock(null, "calzado", "42.5", 3)).toBe(3);
  });

  it("traduce el género del producto a la sección pública correspondiente", () => {
    expect(publicStoreSectionFromGender("HOMBRE")).toBe("hombre");
    expect(publicStoreSectionFromGender("NINA")).toBe("nina");
    expect(publicStoreSectionFromGender("UNISEX")).toBeNull();
  });
});
