import { describe, expect, it } from "vitest";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";

/**
 * Tests de validadores y reglas de mutación de productos.
 * No requiere base de datos: comprueba la capa de validación que es la primera
 * línea de defensa en createProduct/updateProduct.
 */

const baseProduct = {
  name: "Chaqueta trekking",
  slug: "chaqueta-trekking-azul",
  brandId: "ckxxxxxxxxxxxxxxxxxxxxxxx",
  categoryId: "ckyyyyyyyyyyyyyyyyyyyyyyy",
  colorName: "Azul",
  retailPrice: 49.95,
  gender: "UNISEX" as const,
};

describe("ProductSchema", () => {
  it("acepta un producto mínimo válido", () => {
    const parsed = ProductSchema.parse(baseProduct);
    expect(parsed.name).toBe("Chaqueta trekking");
    expect(parsed.status).toBe("DRAFT"); // default
    expect(parsed.taxRate).toBe(21);
    expect(parsed.colorName).toBe("Azul");
  });

  it("rechaza slug con mayúsculas o espacios", () => {
    expect(() =>
      ProductSchema.parse({ ...baseProduct, slug: "Chaqueta Azul" }),
    ).toThrow();
    expect(() =>
      ProductSchema.parse({ ...baseProduct, slug: "CHAQUETA-AZUL" }),
    ).toThrow();
  });

  it("acepta slug con guiones, números y minúsculas", () => {
    const parsed = ProductSchema.parse({
      ...baseProduct,
      slug: "chaqueta-azul-2024-v2",
    });
    expect(parsed.slug).toBe("chaqueta-azul-2024-v2");
  });

  it("rechaza precio negativo", () => {
    expect(() =>
      ProductSchema.parse({ ...baseProduct, retailPrice: -1 }),
    ).toThrow();
  });

  it("rechaza colorHex con formato inválido", () => {
    expect(() =>
      ProductSchema.parse({ ...baseProduct, colorHex: "azul" }),
    ).toThrow();
    expect(() =>
      ProductSchema.parse({ ...baseProduct, colorHex: "#fff" }),
    ).toThrow();
  });

  it("acepta colorHex válido", () => {
    const parsed = ProductSchema.parse({ ...baseProduct, colorHex: "#0a1b2c" });
    expect(parsed.colorHex).toBe("#0a1b2c");
  });

  it("limita tags a máximo 20", () => {
    const manyTags = Array.from({ length: 21 }, (_, i) => `t${i}`);
    expect(() =>
      ProductSchema.parse({ ...baseProduct, tags: manyTags }),
    ).toThrow();
  });

  it("permite externalUrl vacío", () => {
    const parsed = ProductSchema.parse({ ...baseProduct, externalUrl: "" });
    expect(parsed.externalUrl).toBe("");
  });
});

describe("ProductSizeSchema", () => {
  it("acepta talla con EAN-13 válido", () => {
    const parsed = ProductSizeSchema.parse({
      size: "M",
      ean: "8412345678901",
      stock: 5,
    });
    expect(parsed.size).toBe("M");
    expect(parsed.ean).toBe("8412345678901");
  });

  it("rechaza EAN con letras", () => {
    expect(() =>
      ProductSizeSchema.parse({ size: "M", ean: "abc12345" }),
    ).toThrow();
  });

  it("rechaza EAN demasiado corto", () => {
    expect(() => ProductSizeSchema.parse({ size: "M", ean: "1234" })).toThrow();
  });

  it("permite talla sin EAN", () => {
    const parsed = ProductSizeSchema.parse({ size: "ÚNICA", stock: 0 });
    expect(parsed.size).toBe("ÚNICA");
    expect(parsed.stock).toBe(0);
  });

  it("rechaza stock negativo", () => {
    expect(() =>
      ProductSizeSchema.parse({ size: "M", stock: -1 }),
    ).toThrow();
  });
});
