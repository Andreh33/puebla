import { describe, it, expect } from "vitest";
import { planSale, type PosLineInput, type PosProduct } from "@/lib/pos/sale";

const SHOE: PosProduct = {
  id: "p1", name: "Zapatilla LLO878 Azul", sku: "LLO878", modelCode: null,
  externalId: null, primaryCategorySlug: "hombre-calzado", taxRate: 21,
  productStock: 0, costPrice: 18,
  sizes: [
    { size: "40", stock: 3, costPrice: 19.5 },
    { size: "41", stock: 0 },
  ],
};
const BALL: PosProduct = {
  id: "p2", name: "Balón Joma", sku: "BAL1", modelCode: null,
  externalId: null, primaryCategorySlug: "accesorios", taxRate: 21,
  productStock: 5, costPrice: 6, sizes: [],
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

  it("TPV: permite vender una talla sin stock (el stock puede ir negativo)", () => {
    // SHOE talla 41 tiene stock 0 → en la caja física se vende igual.
    const r = planSale([{ productId: "p1", size: "41", quantity: 1, unitPrice: 30, lineDiscount: 0 }], [SHOE]);
    expect(r.stockDeltas).toEqual([{ productId: "p1", size: "41", quantity: 1 }]);
    expect(r.items[0]!.productSku).toBe("LLO878/41");
  });

  it("lanza si el producto no existe o la cantidad es <= 0", () => {
    expect(() => planSale([{ productId: "x", size: null, quantity: 1, unitPrice: 1, lineDiscount: 0 }], [SHOE])).toThrow();
    expect(() => planSale([{ productId: "p2", size: null, quantity: 0, unitPrice: 1, lineDiscount: 0 }], [BALL])).toThrow();
  });

  it("TPV: permite varias líneas del mismo producto/talla aunque superen el stock", () => {
    // 2 + 2 = 4 > stock 3, pero la caja física lo permite (stock negativo).
    const dup: PosLineInput[] = [
      { productId: "p1", size: "40", quantity: 2, unitPrice: 30, lineDiscount: 0 },
      { productId: "p1", size: "40", quantity: 2, unitPrice: 30, lineDiscount: 0 },
    ];
    expect(planSale(dup, [SHOE]).items).toHaveLength(2);
  });

  it("TPV: permite vender sin talla aunque supere Product.stock", () => {
    // 3 + 3 = 6 > stock 5, pero se permite (caja física).
    const dup: PosLineInput[] = [
      { productId: "p2", size: null, quantity: 3, unitPrice: 12, lineDiscount: 0 },
      { productId: "p2", size: null, quantity: 3, unitPrice: 12, lineDiscount: 0 },
    ];
    expect(planSale(dup, [BALL]).items).toHaveLength(2);
  });

  it("congela unitCost: usa el coste de la talla si lo trae", () => {
    const r = planSale([{ productId: "p1", size: "40", quantity: 1, unitPrice: 30, lineDiscount: 0 }], [SHOE]);
    expect(r.items[0]!.unitCost).toBe(19.5); // coste de la talla 40
  });

  it("congela unitCost: cae al coste del producto si la talla no lo trae", () => {
    // SHOE talla 41 no tiene costPrice propio → fallback al del producto (18),
    // pero su stock es 0; le subimos stock para que la línea sea válida.
    const shoeWithStock: PosProduct = {
      ...SHOE,
      sizes: [{ size: "41", stock: 2 /* sin costPrice */ }],
    };
    const r = planSale(
      [{ productId: "p1", size: "41", quantity: 1, unitPrice: 30, lineDiscount: 0 }],
      [shoeWithStock],
    );
    expect(r.items[0]!.unitCost).toBe(18); // coste del producto (fallback)
  });

  it("unitCost null si el producto no tiene coste", () => {
    const noCost: PosProduct = { ...BALL, id: "p3", costPrice: null };
    const r = planSale([{ productId: "p3", size: null, quantity: 1, unitPrice: 12, lineDiscount: 0 }], [noCost]);
    expect(r.items[0]!.unitCost).toBeNull();
  });
});
