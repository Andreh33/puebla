import { describe, expect, it } from "vitest";
import { compareProductSizes, sortSizeFacets } from "@/lib/products/size-order";

describe("orden comercial de tallas", () => {
  it("ordena calzado numéricamente, incluidos coma, punto y fracciones", () => {
    const sizes = ["44", "42.5", "40", "45,5", "42", "40 2/3", "43\\"];

    expect([...sizes].sort(compareProductSizes)).toEqual([
      "40",
      "40 2/3",
      "42",
      "42.5",
      "43\\",
      "44",
      "45,5",
    ]);
  });

  it("ordena escalas textiles y deja las tallas futuras en su posición", () => {
    const sizes = ["3XL", "M", "L/XL", "XS", "2XL", "S/M", "XL", "S", "4XL", "L"];

    expect([...sizes].sort(compareProductSizes)).toEqual([
      "XS",
      "S",
      "S/M",
      "M",
      "L",
      "L/XL",
      "XL",
      "2XL",
      "3XL",
      "4XL",
    ]);
  });

  it("ordena facetas sin mutar la respuesta original", () => {
    const facets = [
      { value: "12", count: 1 },
      { value: "6", count: 2 },
      { value: "10", count: 3 },
      { value: "8", count: 4 },
    ];

    expect(sortSizeFacets(facets).map((item) => item.value)).toEqual(["6", "8", "10", "12"]);
    expect(facets.map((item) => item.value)).toEqual(["12", "6", "10", "8"]);
  });
});
