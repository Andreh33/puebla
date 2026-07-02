/** IVA por defecto (v1): 21% incluido en los precios retail. */
export const IVA_RATE = 21;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Totales de una venta con precios IVA-incluido. `lineSubtotals` ya trae cada
 * línea con su descuento de línea aplicado. `total = Σlíneas - totalDiscount`,
 * acotado a 0. `tax` = IVA contenido en el total; `subtotal` = base sin IVA.
 */
export function planTotals(opts: {
  lineSubtotals: number[];
  totalDiscount?: number;
  ivaRate?: number;
}): { subtotal: number; tax: number; total: number } {
  const ivaRate = opts.ivaRate ?? IVA_RATE;
  const gross = opts.lineSubtotals.reduce((a, b) => a + b, 0);
  // El descuento total nunca supera el bruto (defensa: no vender por debajo de 0).
  const total = Math.max(0, round2(gross - Math.min(opts.totalDiscount ?? 0, gross)));
  const base = round2(total / (1 + ivaRate / 100));
  const tax = round2(total - base);
  return { subtotal: base, tax, total };
}
