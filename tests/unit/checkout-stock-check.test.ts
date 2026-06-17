import { describe, it, expect } from "vitest";
import {
  assertStockAvailable,
  type StockCheckItem,
  type StockCheckProduct,
} from "@/lib/stripe/stock-check";

/**
 * Tests de la validación de stock del checkout ONLINE (Stripe). Función pura:
 * recibe items + mapa de productos, no toca DB ni Stripe. Espeja la regla del
 * TPV (demanda acumulada por producto::talla).
 */

const SHOE: StockCheckProduct = {
  id: "p1",
  name: "Zapatilla Azul",
  stock: 0,
  sizes: [
    { size: "40", stock: 3 },
    { size: "41", stock: 0 },
  ],
};
const BALL: StockCheckProduct = {
  id: "p2",
  name: "Balón Joma",
  stock: 5,
  sizes: [],
};

function map(...ps: StockCheckProduct[]): Map<string, StockCheckProduct> {
  return new Map(ps.map((p) => [p.id, p]));
}

describe("assertStockAvailable (checkout online)", () => {
  it("acepta cuando la talla tiene stock suficiente", () => {
    const items: StockCheckItem[] = [{ productId: "p1", name: "x", size: "40", qty: 2 }];
    expect(assertStockAvailable(items, map(SHOE))).toEqual({ ok: true });
  });

  it("rechaza (out_of_stock) cuando la talla pedida no tiene stock", () => {
    const items: StockCheckItem[] = [{ productId: "p1", name: "x", size: "41", qty: 1 }];
    const r = assertStockAvailable(items, map(SHOE));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.size).toBe("41");
      expect(r.message).toMatch(/Sin stock suficiente/i);
      expect(r.message).toContain("Zapatilla Azul");
    }
  });

  it("rechaza cuando la cantidad supera el stock de la talla", () => {
    const items: StockCheckItem[] = [{ productId: "p1", name: "x", size: "40", qty: 4 }];
    expect(assertStockAvailable(items, map(SHOE)).ok).toBe(false);
  });

  it("rechaza cuando la talla no existe en el producto", () => {
    const items: StockCheckItem[] = [{ productId: "p1", name: "x", size: "99", qty: 1 }];
    expect(assertStockAvailable(items, map(SHOE)).ok).toBe(false);
  });

  it("producto sin talla: valida contra Product.stock", () => {
    expect(
      assertStockAvailable([{ productId: "p2", name: "x", size: null, qty: 5 }], map(BALL)).ok,
    ).toBe(true);
    expect(
      assertStockAvailable([{ productId: "p2", name: "x", size: null, qty: 6 }], map(BALL)).ok,
    ).toBe(false);
  });

  it("acumula demanda entre líneas del mismo producto/talla (anti-oversell)", () => {
    // 2 + 2 = 4 > 3 → rechaza
    const dup: StockCheckItem[] = [
      { productId: "p1", name: "x", size: "40", qty: 2 },
      { productId: "p1", name: "x", size: "40", qty: 2 },
    ];
    expect(assertStockAvailable(dup, map(SHOE)).ok).toBe(false);
    // 2 + 1 = 3 ≤ 3 → acepta
    const ok: StockCheckItem[] = [
      { productId: "p1", name: "x", size: "40", qty: 2 },
      { productId: "p1", name: "x", size: "40", qty: 1 },
    ];
    expect(assertStockAvailable(ok, map(SHOE)).ok).toBe(true);
  });

  it("usa el nombre del item si el producto no trae nombre", () => {
    const noName: StockCheckProduct = { id: "p3", name: "", stock: 0, sizes: [] };
    const r = assertStockAvailable(
      [{ productId: "p3", name: "Camiseta Fallback", size: null, qty: 1 }],
      map(noName),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("Camiseta Fallback");
  });
});
