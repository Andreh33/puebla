/**
 * Aritmética pura de los códigos de promoción. Sin BD ni efectos: la comparten
 * la UI (web/TPV) y los tests. El descuento se expresa siempre en EUROS sobre el
 * importe bruto (IVA incluido) y nunca supera ese importe.
 */

export type DiscountType = "PERCENT" | "FIXED";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Normaliza un código a la forma canónica (sin espacios, MAYÚSCULAS). */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Descuento en € para un código de tipo `type`/`value` sobre `subtotalGross`
 * (bruto, IVA incl.). PERCENT: `value`% acotado a [0,100]. FIXED: `value` €.
 * Nunca negativo ni mayor que el propio bruto.
 */
export function computeDiscount(type: DiscountType, value: number, subtotalGross: number): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(subtotalGross) || subtotalGross <= 0) {
    return 0;
  }
  const raw = type === "PERCENT" ? (subtotalGross * Math.min(value, 100)) / 100 : value;
  return round2(Math.min(Math.max(0, raw), subtotalGross));
}
