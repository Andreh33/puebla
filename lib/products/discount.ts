/**
 * Aritmética pura del descuento por producto (PVP ↔ precio rebajado ↔ %). Sin
 * efectos: la comparte el editor y los tests. NUNCA devuelve un precio rebajado
 * de 0 o negativo (eso no es una oferta, sino "gratis" — ver lib/price.ts).
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Precio rebajado a partir de un % de descuento sobre el PVP. Devuelve null si no
 * aplica: PVP no positivo, o `pct` fuera de (0, 100), o el resultado no queda
 * estrictamente entre 0 y el PVP.
 */
export function salePriceFromPercent(retail: number, pct: number): number | null {
  if (!Number.isFinite(retail) || retail <= 0) return null;
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
  const sale = round2(retail * (1 - pct / 100));
  return sale > 0 && sale < retail ? sale : null;
}

/**
 * % de descuento (entero redondeado) a partir de PVP y precio rebajado, o null si
 * no hay oferta válida (rebajado nulo/≤0/≥PVP).
 */
export function percentFromPrices(retail: number, sale: number | null | undefined): number | null {
  if (!Number.isFinite(retail) || retail <= 0) return null;
  if (sale == null || !Number.isFinite(sale) || sale <= 0 || sale >= retail) return null;
  return Math.round((1 - sale / retail) * 100);
}
