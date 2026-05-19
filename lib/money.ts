import { Decimal } from "decimal.js";

export function decimalToNumber(d: Decimal | number | string | null | undefined): number {
  if (d == null || d === "") return 0;
  if (d instanceof Decimal) return d.toNumber();
  if (typeof d === "number") return d;
  const n = Number(d);
  return Number.isFinite(n) ? n : 0;
}

export function priceWithIva(priceWithoutTax: number, taxRate: number): number {
  return Math.round(priceWithoutTax * (1 + taxRate / 100) * 100) / 100;
}

export function priceWithoutIva(priceWithTax: number, taxRate: number): number {
  return Math.round((priceWithTax / (1 + taxRate / 100)) * 100) / 100;
}
