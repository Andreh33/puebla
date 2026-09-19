export type PublicStoreSection = "hombre" | "mujer" | "nino" | "nina" | "bebe";
export type PublicProductFamily = "calzado" | "textil";

const HIDDEN_FOOTWEAR_SIZES: Readonly<Record<PublicStoreSection, ReadonlySet<string>>> = {
  hombre: new Set(["42.5", "43\\", "44.5", "48\\"]),
  mujer: new Set(["37\\", "38\\"]),
  nino: new Set(["37\\", "38\\"]),
  nina: new Set(["37\\"]),
  bebe: new Set(),
};

function normalizeMalformedSeparator(size: string): string {
  const normalized = size.trim();
  return normalized.endsWith("/") ? `${normalized.slice(0, -1)}\\` : normalized;
}

/**
 * Regla exclusivamente visual para la tienda pública. No modifica tallas ni
 * stock en base de datos y deja intactas todas las tallas de textil.
 */
export function isPublicSizeVisible(
  section: PublicStoreSection,
  family: PublicProductFamily,
  size: string,
): boolean {
  if (family !== "calzado") return true;
  return !HIDDEN_FOOTWEAR_SIZES[section].has(normalizeMalformedSeparator(size));
}

export function publicSizeStock(
  section: PublicStoreSection | null,
  family: PublicProductFamily,
  size: string,
  stock: number,
): number {
  return section == null || isPublicSizeVisible(section, family, size) ? stock : 0;
}

export function publicStoreSectionFromGender(gender: string): PublicStoreSection | null {
  switch (gender) {
    case "HOMBRE":
      return "hombre";
    case "MUJER":
      return "mujer";
    case "NINO":
      return "nino";
    case "NINA":
      return "nina";
    case "BEBE":
      return "bebe";
    default:
      return null;
  }
}
