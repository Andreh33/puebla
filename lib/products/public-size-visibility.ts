export type PublicStoreSection = "hombre" | "mujer" | "nino" | "nina" | "bebe";
export type PublicProductFamily = "calzado" | "textil";

function hasMalformedFootwearFormat(size: string): boolean {
  const normalized = size.trim();
  const usesDecimalPoint = /^\d+\.\d+$/.test(normalized);
  const endsWithSlash = /[\\/]$/.test(normalized);
  return usesDecimalPoint || endsWithSlash;
}

/**
 * Regla exclusivamente visual para la tienda pública. No modifica tallas ni
 * stock en base de datos y deja intactas todas las tallas de textil.
 */
export function isPublicSizeVisible(
  _section: PublicStoreSection | null,
  family: PublicProductFamily,
  size: string,
): boolean {
  if (family !== "calzado") return true;
  return !hasMalformedFootwearFormat(size);
}

export function publicSizeStock(
  section: PublicStoreSection | null,
  family: PublicProductFamily,
  size: string,
  stock: number,
): number {
  return isPublicSizeVisible(section, family, size) ? stock : 0;
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
