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
  });
});
