import { describe, it, expect } from "vitest";
import { TAXONOMY_TREE, VALID_VARIANT_SLUGS } from "@/lib/categories/taxonomy-tree";

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
  it("hombre-calzado-padel existe con parent hombre-calzado", () => {
    const node = TAXONOMY_TREE.find((n) => n.slug === "hombre-calzado-padel");
    expect(node).toBeTruthy();
    expect(node!.parentSlug).toBe("hombre-calzado");
  });
  it("mujer-textil-camiseta existe con parent mujer-textil", () => {
    const node = TAXONOMY_TREE.find((n) => n.slug === "mujer-textil-camiseta");
    expect(node).toBeTruthy();
    expect(node!.parentSlug).toBe("mujer-textil");
  });
  it("cada gen tiene los 8 tipos de calzado como hijos de <gen>-calzado", () => {
    for (const g of ["hombre", "mujer", "nino", "nina", "bebe"]) {
      for (const t of ["running", "trail", "padel", "futbol", "futbol-sala", "casual", "baloncesto", "chanclas"]) {
        expect(slugs.has(`${g}-calzado-${t}`), `${g}-calzado-${t}`).toBe(true);
      }
    }
  });
  it("cada gen tiene los 12 tipos de textil como hijos de <gen>-textil", () => {
    for (const g of ["hombre", "mujer", "nino", "nina", "bebe"]) {
      for (const t of ["camiseta", "polo", "sudadera", "polar", "chandal", "chaqueta", "abrigo", "cortavientos", "conjunto", "pantalon", "mallas", "banador"]) {
        expect(slugs.has(`${g}-textil-${t}`), `${g}-textil-${t}`).toBe(true);
      }
    }
  });

  // --- Feature A: nodos de variante de prenda (4º nivel) ---------------------
  it("VALID_VARIANT_SLUGS incluye variantes válidas y excluye las prohibidas", () => {
    expect(VALID_VARIANT_SLUGS.has("hombre-textil-camiseta-manga-corta")).toBe(true);
    expect(VALID_VARIANT_SLUGS.has("mujer-textil-camiseta-top")).toBe(true);
    // top/tirantes solo en mujer+niña → hombre no
    expect(VALID_VARIANT_SLUGS.has("hombre-textil-camiseta-top")).toBe(false);
    // bebé no tiene nodos de variante
    expect(VALID_VARIANT_SLUGS.has("bebe-textil-camiseta-manga-corta")).toBe(false);
  });
  it("los nodos de variante cuelgan de su nodo de prenda", () => {
    for (const s of VALID_VARIANT_SLUGS) {
      const node = TAXONOMY_TREE.find((n) => n.slug === s)!;
      expect(node, s).toBeTruthy();
      expect(slugs.has(node.parentSlug!), `${s} → parent ${node.parentSlug}`).toBe(true);
      expect(/-textil-(?:camiseta|pantalon|mallas)$/.test(node.parentSlug!), node.parentSlug!).toBe(true);
    }
  });
});
