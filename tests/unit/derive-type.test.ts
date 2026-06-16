import { describe, it, expect } from "vitest";
import {
  deriveFootwearTypeFromSlugs,
  deriveGarmentTypeFromSlugs,
  deriveGarmentVariantFromSlugs,
} from "@/lib/products/derive-type";

describe("derive footwear/garment from category slugs", () => {
  it("calzado padel", () => expect(deriveFootwearTypeFromSlugs(["hombre-calzado-padel"])).toBe("padel"));
  it("futbol-sala → futbol_sala", () => expect(deriveFootwearTypeFromSlugs(["mujer-calzado-futbol-sala"])).toBe("futbol_sala"));
  it("sin calzado → null", () => expect(deriveFootwearTypeFromSlugs(["hombre-textil-camiseta"])).toBeNull());
  it("textil camiseta", () => expect(deriveGarmentTypeFromSlugs(["hombre-textil-camiseta"])).toBe("camiseta"));
  it("textil mallas", () => expect(deriveGarmentTypeFromSlugs(["nina-textil-mallas"])).toBe("mallas"));
  it("sin textil → null", () => expect(deriveGarmentTypeFromSlugs(["hombre-calzado-padel"])).toBeNull());
});

describe("derive garment variant from category slugs", () => {
  it("manga corta", () => expect(deriveGarmentVariantFromSlugs(["mujer-textil-camiseta-manga-corta"])).toBe("manga_corta"));
  it("mallas piratas", () => expect(deriveGarmentVariantFromSlugs(["nina-textil-mallas-piratas"])).toBe("mallas_piratas"));
  it("sin variante (solo nodo de prenda) → null", () =>
    expect(deriveGarmentVariantFromSlugs(["hombre-textil-camiseta"])).toBeNull());
  it("calzado → null", () => expect(deriveGarmentVariantFromSlugs(["hombre-calzado-padel"])).toBeNull());
});
