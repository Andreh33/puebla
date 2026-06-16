import { describe, it, expect } from "vitest";
import { classifyToTree } from "@/lib/importer/classify-to-tree";

describe("classifyToTree", () => {
  it("zapatilla running hombre", () => {
    const r = classifyToTree("ZAPATILLA RUNNING JOMA", "HOMBRE", "Joma");
    expect(r.footwearType).toBe("running");
    expect(r.categorySlugs).toContain("hombre-calzado");
    expect(r.categorySlugs).toContain("hombre-calzado-running");
    expect(r.primarySlug).toBe("hombre-calzado-running");
  });
  it("camiseta mujer", () => {
    const r = classifyToTree("CAMISETA TECNICA MUJER", "MUJER", null);
    expect(r.garmentType).toBe("camiseta");
    expect(r.categorySlugs).toContain("mujer-textil");
    expect(r.categorySlugs).toContain("mujer-textil-camiseta");
  });
  it("unisex → hombre y mujer", () => {
    const r = classifyToTree("SUDADERA UNISEX", "UNISEX", null);
    expect(r.categorySlugs).toEqual(expect.arrayContaining(["hombre-textil", "mujer-textil"]));
  });
  it("accesorio gorra", () => {
    const r = classifyToTree("GORRA JOHN SMITH", "NO_ESPECIFICADO", "John Smith");
    expect(r.primarySlug).toBe("accesorios-gorras");
  });
  it("zapatilla futbol sala → slug con guion", () => {
    const r = classifyToTree("ZAPATILLA FUTBOL SALA", "HOMBRE", null);
    expect(r.footwearType).toBe("futbol_sala");
    expect(r.categorySlugs).toContain("hombre-calzado-futbol-sala");
  });
  it("unclassified → vacío", () => {
    const r = classifyToTree("XYZ123 RARO", "NO_ESPECIFICADO", null);
    expect(r.primarySlug).toBeNull();
    expect(r.categorySlugs).toEqual([]);
    expect(r.garmentVariant).toBeNull();
  });

  // --- Feature A: variantes de prenda como 4º nivel del árbol -----------------
  it("camiseta manga corta mujer → nodo de variante + garmentVariant", () => {
    const r = classifyToTree("CAMISETA JOMA X MANGA CORTA", "MUJER", null);
    expect(r.categorySlugs).toContain("mujer-textil-camiseta-manga-corta");
    expect(r.garmentVariant).toBe("manga_corta");
  });
  it("camiseta TOP hombre → sin top (hombre no tiene), garmentVariant null", () => {
    const r = classifyToTree("CAMISETA TOP X", "HOMBRE", null);
    expect(r.categorySlugs.some((s) => s.endsWith("-top"))).toBe(false);
    expect(r.garmentVariant).toBeNull();
  });
  it("TOP mujer → nodo top + garmentVariant top", () => {
    const r = classifyToTree("TOP DITCHIL X", "MUJER", null);
    expect(r.categorySlugs).toContain("mujer-textil-camiseta-top");
    expect(r.garmentVariant).toBe("top");
  });
  it("mallas 3/4 mujer → mallas piratas", () => {
    const r = classifyToTree("MALLAS JOMA 3/4 X", "MUJER", null);
    expect(r.categorySlugs).toContain("mujer-textil-mallas-piratas");
    expect(r.garmentVariant).toBe("mallas_piratas");
  });
});
