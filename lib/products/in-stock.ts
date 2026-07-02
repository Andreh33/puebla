import type { Prisma } from "@prisma/client";

/**
 * Filtro "con stock" para la tienda pública, robusto ante un `Product.stock`
 * escalar desincronizado: un producto se considera disponible si TIENE alguna
 * talla con stock, o (si no tiene tallas) si el escalar es > 0. Así no se oculta
 * un producto vendible solo porque el agregado escalar quedó obsoleto.
 */
export const IN_STOCK_WHERE: Prisma.ProductWhereInput = {
  OR: [
    { sizes: { some: { stock: { gt: 0 } } } },
    { sizes: { none: {} }, stock: { gt: 0 } },
  ],
};
