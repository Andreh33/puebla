import { describe, expect, it } from "vitest";
import {
  isPublicSizeVisible,
  publicSizeStock,
  publicStoreSectionFromGender,
} from "@/lib/products/public-size-visibility";

describe("visibilidad pública de tallas", () => {
  it("oculta cualquier decimal con punto en todas las secciones de calzado", () => {
    expect(isPublicSizeVisible("hombre", "calzado", "23.5")).toBe(false);
    expect(isPublicSizeVisible("mujer", "calzado", "38.5")).toBe(false);
    expect(isPublicSizeVisible("nino", "calzado", "40.5")).toBe(false);
    expect(isPublicSizeVisible("nina", "calzado", "46.5")).toBe(false);
    expect(isPublicSizeVisible("bebe", "calzado", " 26.5 ")).toBe(false);
  });

  it("oculta cualquier talla de calzado que termine en barra", () => {
    expect(isPublicSizeVisible("hombre", "calzado", "41\\")).toBe(false);
    expect(isPublicSizeVisible("mujer", "calzado", "38/")).toBe(false);
    expect(isPublicSizeVisible("nina", "calzado", " 37\\ ")).toBe(false);
  });

  it("conserva las variantes correctas con coma, enteras y barras internas", () => {
    expect(isPublicSizeVisible("hombre", "calzado", "23,5")).toBe(true);
    expect(isPublicSizeVisible("hombre", "calzado", "40,5")).toBe(true);
    expect(isPublicSizeVisible("mujer", "calzado", "46,5")).toBe(true);
    expect(isPublicSizeVisible("nino", "calzado", "40")).toBe(true);
    expect(isPublicSizeVisible("nina", "calzado", "39/42")).toBe(true);
  });

  it("no altera ninguna talla de ropa", () => {
    expect(isPublicSizeVisible("hombre", "textil", "42.5")).toBe(true);
    expect(isPublicSizeVisible("mujer", "textil", "38\\")).toBe(true);
  });

  it("anula el stock público de una variante oculta sin tocar el valor original", () => {
    expect(publicSizeStock("hombre", "calzado", "40.5", 3)).toBe(0);
    expect(publicSizeStock("hombre", "calzado", "40,5", 3)).toBe(3);
    expect(publicSizeStock(null, "calzado", "42.5", 3)).toBe(0);
  });

  it("traduce el género del producto a la sección pública correspondiente", () => {
    expect(publicStoreSectionFromGender("HOMBRE")).toBe("hombre");
    expect(publicStoreSectionFromGender("NINA")).toBe("nina");
    expect(publicStoreSectionFromGender("UNISEX")).toBeNull();
  });
});
