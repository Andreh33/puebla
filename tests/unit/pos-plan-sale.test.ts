import { describe, it, expect } from "vitest";
import { planSale, type PosLineInput, type PosProduct } from "@/lib/pos/sale";

const SHOE: PosProduct = {
  id: "p1", name: "Zapatilla LLO878 Azul", sku: "LLO878", modelCode: null,
  externalId: null, primaryCategorySlug: "hombre-calzado", taxRate: 21,
  productStock: 0, sizes: [{ size: "40", stock: 3 }, { size: "41", stock: 0 }],
};
const BALL: PosProduct = {
  id: "p2", name: "Balón Joma", sku: "BAL1", modelCode: null,
  externalId: null, primaryCategorySlug: "accesorios", taxRate: 21,
  productStock: 5, sizes: [],
};

describe("planSale", () => {
  it("calzado: descuenta de la talla y compone SKU/talla", () => {
    const lines: PosLineInput[] = [{ productId: "p1", size: "40", quantity: 2, unitPrice: 30, lineDiscount: 0 }];
    const r = planSale(lines, [SHOE]);
    expect(r.items[0]!.productSku).toBe("LLO878/40");
    expect(r.items[0]!.subtotal).toBe(60);
    expect(r.totals.total).toBe(60);
    expect(r.stockDeltas).toEqual([{ productId: "p1", size: "40", quantity: 2 }]);
  });

  it("accesorio sin talla: descuenta de Product.stock y SKU base", () => {
    const r = planSale([{ productId: "p2", size: null, quantity: 1, unitPrice: 12, lineDiscount: 0 }], [BALL]);
    expect(r.items[0]!.productSku).toBe("BAL1");
    expect(r.stockDeltas).toEqual([{ productId: "p2", size: null, quantity: 1 }]);
  });

  it("lanza si la talla no tiene stock suficiente", () => {
    expect(() => planSale([{ productId: "p1", size: "41", quantity: 1, unitPrice: 30, lineDiscount: 0 }], [SHOE]))
      .toThrow(/stock/i);
  });

  it("lanza si el producto no existe o la cantidad es <= 0", () => {
    expect(() => planSale([{ productId: "x", size: null, quantity: 1, unitPrice: 1, lineDiscount: 0 }], [SHOE])).toThrow();
    expect(() => planSale([{ productId: "p2", size: null, quantity: 0, unitPrice: 1, lineDiscount: 0 }], [BALL])).toThrow();
  });
});
