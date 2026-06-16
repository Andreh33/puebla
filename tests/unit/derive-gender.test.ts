import { describe, it, expect } from "vitest";
import { deriveGenderFromCategorySlugs } from "@/lib/products/derive-gender";

describe("deriveGenderFromCategorySlugs", () => {
  it("una raíz de género", () => expect(deriveGenderFromCategorySlugs(["hombre-calzado"])).toBe("HOMBRE"));
  it("raíz directa", () => expect(deriveGenderFromCategorySlugs(["mujer"])).toBe("MUJER"));
  it("bebe", () => expect(deriveGenderFromCategorySlugs(["bebe-textil"])).toBe("BEBE"));
  it("varios géneros → UNISEX", () => expect(deriveGenderFromCategorySlugs(["hombre-calzado", "mujer-calzado"])).toBe("UNISEX"));
  it("solo complementos → NO_ESPECIFICADO", () => expect(deriveGenderFromCategorySlugs(["accesorios", "accesorios-gorras"])).toBe("NO_ESPECIFICADO"));
  it("vacío → NO_ESPECIFICADO", () => expect(deriveGenderFromCategorySlugs([])).toBe("NO_ESPECIFICADO"));
  it("género + complementos → ese género", () => expect(deriveGenderFromCategorySlugs(["hombre-textil", "accesorios-gorras"])).toBe("HOMBRE"));
});
