import { Decimal } from "decimal.js";

/**
 * Parser de precios en formato español (coma decimal).
 * Tolerante: acepta "21,99", "21.99", "1.234,56", "1234.56", números, espacios, "€".
 * Devuelve Decimal con 2 decimales o null si no parsea.
 */
export function parsePriceEs(input: unknown): Decimal | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return new Decimal(input).toDecimalPlaces(2);
  }

  let s = String(input).trim();
  if (!s) return null;
  s = s.replace(/€|EUR|eur|\s+/g, "");

  // Si hay coma y punto, asumimos que el separador decimal es el último que aparece
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // formato europeo: 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // formato anglo: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // solo coma → decimal
    s = s.replace(",", ".");
  }
  // solo punto → ya está en formato anglo

  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  try {
    return new Decimal(s).toDecimalPlaces(2);
  } catch {
    return null;
  }
}

/**
 * Calcula precio final (con/sin oferta) y descuento %.
 */
export function effectivePrice(retail: Decimal | number, sale?: Decimal | number | null) {
  const r = retail instanceof Decimal ? retail : new Decimal(retail ?? 0);
  const s = sale == null ? null : sale instanceof Decimal ? sale : new Decimal(sale);
  const final = s && s.lt(r) ? s : r;
  const onSale = !!(s && s.lt(r));
  const discountPct = onSale
    ? Math.round((1 - final.div(r).toNumber()) * 100)
    : 0;
  return { final, retail: r, onSale, discountPct };
}
