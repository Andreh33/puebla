import { describe, expect, it } from "vitest";
import {
  buildAccessoryProductViewWhere,
  parseAccessoryProductView,
} from "@/lib/products/accessory-product-view";

describe("vista Palas en Complementos", () => {
  it("se activa solo dentro de Complementos → Pádel/Pickleball", () => {
    expect(parseAccessoryProductView("accesorios", "accesorios-padel", "palas")).toBe("palas");
    expect(parseAccessoryProductView("accesorios", "accesorios-mochilas", "palas")).toBeNull();
    expect(parseAccessoryProductView("mujer", "accesorios-padel", "palas")).toBeNull();
    expect(parseAccessoryProductView("accesorios", "accesorios-padel", "otro")).toBeNull();
    expect(parseAccessoryProductView("accesorios", "accesorios-padel", ["palas"])).toBeNull();
  });

  it("filtra nombres PALA sin distinguir mayúsculas", () => {
    expect(buildAccessoryProductViewWhere("palas")).toEqual({
      name: { startsWith: "PALA", mode: "insensitive" },
    });
    expect(buildAccessoryProductViewWhere(null)).toEqual({});
  });
});
