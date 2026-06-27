import { IVA_RATE, round2 } from "./totals";

/**
 * Aritmética de la devolución de una línea de venta (TPV), con precios IVA
 * incluido. Devuelve el BRUTO a reembolsar por `qty` unidades de una línea cuyo
 * subtotal actual es `itemSubtotal` sobre `itemQuantity` unidades, más su
 * desglose base (sin IVA) + cuota de IVA. Todo redondeado a 2 decimales.
 *
 * El bruto es proporcional al subtotal ACTUAL de la línea, así que devolver
 * unidad a unidad (re-derivando desde lo que queda) recupera exactamente el
 * subtotal original sin perder céntimos. El desglose cumple `retBase + retTax
 * === returnedGross`, de modo que decrementar los totales del pedido con estos
 * tres valores preserva el invariante `base + IVA = total`.
 *
 * FUNCIÓN PURA: misma entrada → misma salida, sin efectos.
 */
export function computeItemReturn(
  itemSubtotal: number,
  itemQuantity: number,
  qty: number,
  ivaRate: number = IVA_RATE,
): { returnedGross: number; retBase: number; retTax: number } {
  if (!Number.isFinite(itemSubtotal) || itemQuantity <= 0 || qty <= 0) {
    return { returnedGross: 0, retBase: 0, retTax: 0 };
  }
  const returnedGross = round2((itemSubtotal * qty) / itemQuantity);
  const retBase = round2(returnedGross / (1 + ivaRate / 100));
  const retTax = round2(returnedGross - retBase);
  return { returnedGross, retBase, retTax };
}
