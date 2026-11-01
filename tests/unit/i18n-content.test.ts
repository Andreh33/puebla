import { describe, expect, it } from "vitest";
import { sourceContentHash, validTranslation } from "@/lib/i18n/content-contract";

const source = {
  id: "p1",
  slug: "shoe",
  name: "Zapatilla",
  description: "Descripción de prueba",
  technicalDescription: null,
  colorName: "Azul",
  shortName: null,
  sportUse: null,
  composition: null,
  metaTitle: null,
  metaDescription: null,
  tags: [],
  images: [],
};
describe("translation publication contract", () => {
  it("hashes text deterministically without prices or inventory", () => {
    expect(sourceContentHash("products", source)).toBe(
      sourceContentHash("products", { ...source, retailPrice: 3, stock: 50 }),
    );
    expect(sourceContentHash("products", source)).not.toBe(
      sourceContentHash("products", { ...source, description: "Cambio" }),
    );
  });
  it("rejects missing, stale, mismatched and incomplete translations", () => {
    const record = {
      id: "p1",
      slug: "shoe",
      sourceHash: sourceContentHash("products", source),
      status: "published",
      fields: {
        name: "Sapato",
        description: "Descrição de teste",
        colorName: "Azul",
        tags: [],
        imageAlts: {},
      },
    };
    expect(validTranslation("products", "pt", source, record)).toBe(true);
    expect(validTranslation("products", "pt", source, null)).toBe(false);
    expect(validTranslation("products", "pt", { ...source, description: "new" }, record)).toBe(
      false,
    );
    expect(validTranslation("products", "pt", source, { ...record, id: "p2" })).toBe(false);
    expect(
      validTranslation("products", "pt", source, { ...record, fields: { name: "Sapato" } }),
    ).toBe(false);
  });
});
