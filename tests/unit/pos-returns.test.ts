import { describe, it, expect } from "vitest";
import { computeItemReturn } from "@/lib/pos/returns";

/**
 * Aritmética de la devolución de una línea de TPV (precios con IVA incluido).
 * `computeItemReturn(itemSubtotal, itemQuantity, qty)` devuelve el bruto a
 * devolver (proporcional a las unidades) y su desglose base/IVA, todo a 2
 * decimales. Es la pieza con riesgo de redondeo; el resto de la acción solo
 * decrementa con estos valores.
 */
describe("computeItemReturn — aritmética de devolución (IVA incluido)", () => {
  it("devolver la línea entera devuelve exactamente su subtotal", () => {
    const r = computeItemReturn(19.99, 1, 1);
    expect(r.returnedGross).toBe(19.99);
  });

  it("devolver 1 de 2 unidades devuelve la mitad del subtotal", () => {
    const r = computeItemReturn(39.98, 2, 1);
    expect(r.returnedGross).toBe(19.99);
  });

  it("desglosa el IVA (21%): base sin IVA + cuota, que suman el bruto", () => {
    const r = computeItemReturn(19.99, 1, 1, 21);
    expect(r.retBase).toBe(16.52);
    expect(r.retTax).toBe(3.47);
    expect(r.retBase + r.retTax).toBeCloseTo(19.99, 2);
  });

  it("devolver unidad a unidad una línea de 3 recupera el subtotal original sin perder céntimos", () => {
    let subtotal = 40.0;
    let quantity = 3;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const r = computeItemReturn(subtotal, quantity, 1);
      sum = Math.round((sum + r.returnedGross) * 100) / 100;
      subtotal = Math.round((subtotal - r.returnedGross) * 100) / 100;
      quantity -= 1;
    }
    expect(sum).toBe(40.0);
    expect(subtotal).toBe(0);
  });

  it("preserva el invariante base+IVA=total al decrementar los totales del pedido", () => {
    // Pedido total 100.00 = base 82.64 + IVA 17.36. Devolvemos una línea de 19.99.
    const order = { total: 100.0, base: 82.64, tax: 17.36 };
    const r = computeItemReturn(19.99, 1, 1);
    const newTotal = Math.round((order.total - r.returnedGross) * 100) / 100;
    const newBase = Math.round((order.base - r.retBase) * 100) / 100;
    const newTax = Math.round((order.tax - r.retTax) * 100) / 100;
    expect(newBase + newTax).toBeCloseTo(newTotal, 2);
  });

  it("es defensiva ante cantidades inválidas (no divide por cero)", () => {
    expect(computeItemReturn(10, 0, 1)).toEqual({ returnedGross: 0, retBase: 0, retTax: 0 });
    expect(computeItemReturn(10, 2, 0)).toEqual({ returnedGross: 0, retBase: 0, retTax: 0 });
  });
});
