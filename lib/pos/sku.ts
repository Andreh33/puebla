export type ProductFamily = "calzado" | "textil" | "accesorio";

/** Familia a partir del slug de la categoría principal (mismo criterio que el admin). */
export function productFamily(primaryCategorySlug: string | null | undefined): ProductFamily {
  if (primaryCategorySlug?.endsWith("-calzado")) return "calzado";
  if (primaryCategorySlug?.endsWith("-textil")) return "textil";
  return "accesorio";
}

/** SKU por unidad vendida: calzado `SKU/talla`, textil `SKUtalla`, sin talla `SKU`. */
export function buildVariantSku(opts: {
  baseSku: string;
  size: string | null | undefined;
  family: ProductFamily;
}): string {
  const { baseSku, size, family } = opts;
  if (!size) return baseSku;
  return family === "calzado" ? `${baseSku}/${size}` : `${baseSku}${size}`;
}

/** SKU base o fallback (igual que la tabla de productos del admin). */
export function skuOrFallback(p: {
  sku: string | null;
  modelCode: string | null;
  externalId: string | null;
  id: string;
}): string {
  return p.sku || p.modelCode || p.externalId || p.id.slice(0, 8).toUpperCase();
}
