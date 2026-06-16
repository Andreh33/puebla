import { FOOTWEAR_TYPES } from "@/lib/categories/footwear";
import { GARMENT_TYPES, VARIANT_BY_SLUG_SUFFIX } from "@/lib/categories/garment";

/**
 * De un slug tipo `<gen>-calzado-<tipo>` extrae el footwearType.
 * Convierte guiones a guiones bajos: `futbol-sala` → `futbol_sala`.
 * Devuelve null si ningún slug coincide.
 */
export function deriveFootwearTypeFromSlugs(slugs: string[]): string | null {
  for (const s of slugs) {
    const m = s.match(/-calzado-(.+)$/);
    const raw = m?.[1];
    if (raw !== undefined) {
      const t = raw.replace(/-/g, "_");
      if ((FOOTWEAR_TYPES as readonly string[]).includes(t)) return t;
    }
  }
  return null;
}

/**
 * De un slug tipo `<gen>-textil-<tipo>` extrae el garmentType.
 * Devuelve null si ningún slug coincide.
 */
export function deriveGarmentTypeFromSlugs(slugs: string[]): string | null {
  for (const s of slugs) {
    const m = s.match(/-textil-(.+)$/);
    const raw = m?.[1];
    if (raw !== undefined && (GARMENT_TYPES as readonly string[]).includes(raw)) return raw;
  }
  return null;
}

/** De `<gen>-textil-<prenda>-<variante>` extrae el GarmentVariant; null si ninguno casa. */
export function deriveGarmentVariantFromSlugs(slugs: string[]): string | null {
  for (const s of slugs) {
    const m = s.match(/-textil-((?:camiseta|pantalon|mallas)-.+)$/);
    const suffix = m?.[1];
    if (suffix && VARIANT_BY_SLUG_SUFFIX[suffix]) return VARIANT_BY_SLUG_SUFFIX[suffix];
  }
  return null;
}
