import type { Prisma } from "@prisma/client";

export const ACCESSORIES_CATEGORY_SLUG = "accesorios";
export const PADEL_ACCESSORIES_SUBCATEGORY_SLUG = "accesorios-padel";
export const ACCESSORY_PRODUCT_VIEW_PARAM = "articulo";

export type AccessoryProductView = "palas";

/**
 * Lee una vista fina de productos solo dentro de su categoría válida. Así un
 * parámetro `articulo` copiado a otra URL no puede filtrar otros listados.
 */
export function parseAccessoryProductView(
  categorySlug: string,
  subcategorySlug: string | null,
  rawView: string | string[] | undefined,
): AccessoryProductView | null {
  if (
    categorySlug !== ACCESSORIES_CATEGORY_SLUG ||
    subcategorySlug !== PADEL_ACCESSORIES_SUBCATEGORY_SLUG
  ) {
    return null;
  }

  return rawView === "palas" ? "palas" : null;
}

/**
 * Las palas ya se clasifican como accesorios de pádel cuando su nombre empieza
 * por PALA. Reutilizamos esa misma regla sin cambiar datos ni crear categorías.
 */
export function buildAccessoryProductViewWhere(
  view: AccessoryProductView | null,
): Prisma.ProductWhereInput {
  if (view !== "palas") return {};

  return {
    name: {
      startsWith: "PALA",
      mode: "insensitive",
    },
  };
}
