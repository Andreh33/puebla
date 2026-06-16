import { describe, it, expect } from "vitest";
import { TAXONOMY_TREE } from "@/lib/categories/taxonomy-tree";

describe("TAXONOMY_TREE (árbol canónico de categorías)", () => {
  const slugs = new Set(TAXONOMY_TREE.map((n) => n.slug));

  it("slugs únicos", () => {
    expect(slugs.size).toBe(TAXONOMY_TREE.length);
  });
  it("todo parentSlug (no nulo) existe como nodo", () => {
    for (const n of TAXONOMY_TREE) {
      if (n.parentSlug) expect(slugs.has(n.parentSlug)).toBe(true);
    }
  });
  it("raíces de género + complementos presentes y sin parent", () => {
    for (const root of ["hombre", "mujer", "nino", "nina", "bebe", "accesorios"]) {
      const node = TAXONOMY_TREE.find((n) => n.slug === root);
      expect(node, root).toBeTruthy();
      expect(node!.parentSlug).toBeNull();
    }
  });
  it("la raíz accesorios se llama 'Complementos'", () => {
    expect(TAXONOMY_TREE.find((n) => n.slug === "accesorios")!.name).toBe("Complementos");
  });
  it("Bebé tiene textil y calzado", () => {
    expect(slugs.has("bebe-textil")).toBe(true);
    expect(slugs.has("bebe-calzado")).toBe(true);
  });
  it("cada género tiene -textil y -calzado", () => {
    for (const g of ["hombre", "mujer", "nino", "nina", "bebe"]) {
      expect(slugs.has(`${g}-textil`)).toBe(true);
      expect(slugs.has(`${g}-calzado`)).toBe(true);
    }
  });
  it("hijos finos de complementos casan con las subfamilias del clasificador", () => {
    for (const suf of ["padel","mochilas","balones","calcetines","gorras","guantes","bolsos","billeteros","rinonera","espinilleras","gafas-natacion","patinaje","varios"]) {
      const node = TAXONOMY_TREE.find((n) => n.slug === `accesorios-${suf}`);
      expect(node, suf).toBeTruthy();
      expect(node!.parentSlug).toBe("accesorios");
    }
  });
});
