/**
 * Resolución de la "referencia" pública (SKU) que se muestra en la ficha
 * de producto. Prioridad:
 *   1. modelCode (p.ej. "M24205") si existe y no está vacío.
 *   2. externalId tal cual ("demo:..." o "pricat:...") si existe.
 *   3. Fallback: primeros 8 caracteres del id (cuid) en mayúsculas.
 *
 * La función es pura y testeable.
 */

export interface SkuInput {
  modelCode?: string | null;
  externalId?: string | null;
  id: string;
}

function isNonEmpty(s: string | null | undefined): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

export function resolveProductSku(input: SkuInput): string {
  if (isNonEmpty(input.modelCode)) return input.modelCode.trim();
  if (isNonEmpty(input.externalId)) return input.externalId.trim();
  return input.id.slice(0, 8).toUpperCase();
}
