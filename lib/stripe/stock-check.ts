/**
 * Validación de stock para el checkout ONLINE (Stripe), extraída como función
 * pura para poder testearla sin montar el route (que arrastra next/server +
 * Stripe). Espeja la regla del TPV físico (lib/pos/sale.ts → planSale): valida
 * la DEMANDA ACUMULADA por (producto, talla), no línea a línea, para no permitir
 * oversell cuando el mismo artículo aparece varias veces en el carrito.
 *
 * No depende de Prisma ni del SDK de Stripe: recibe items + snapshot de stock.
 */

export interface StockCheckItem {
  productId: string;
  /** Nombre para el mensaje de error (cae al del producto si falta). */
  name: string;
  size: string | null;
  qty: number;
}

export interface StockCheckProduct {
  id: string;
  name: string;
  /** Stock global del producto (se usa solo si NO hay talla). */
  stock: number;
  sizes: Array<{ size: string; stock: number }>;
}

export type StockCheckResult =
  | { ok: true }
  | { ok: false; productName: string; size: string | null; message: string };

/**
 * Devuelve `{ ok: true }` si TODO el carrito tiene stock suficiente, o el primer
 * fallo con un mensaje listo para enseñar al cliente. La acumulación por clave
 * (producto::talla) evita el oversell entre líneas repetidas.
 */
export function assertStockAvailable(
  items: StockCheckItem[],
  products: Map<string, StockCheckProduct>,
): StockCheckResult {
  const consumed = new Map<string, number>();
  for (const it of items) {
    const p = products.get(it.productId);
    // El caller ya valida la existencia/ACTIVE del producto antes de llamar aquí;
    // si por lo que sea no está, no es trabajo de esta función decidirlo.
    if (!p) continue;
    const name = p.name || it.name;
    const key = `${it.productId}::${it.size ?? ""}`;
    const wanted = (consumed.get(key) ?? 0) + it.qty;

    if (it.size) {
      const ps = p.sizes.find((s) => s.size === it.size);
      if (!ps || ps.stock < wanted) {
        return {
          ok: false,
          productName: name,
          size: it.size,
          message: `Sin stock suficiente de "${name}" (talla ${it.size}). Actualiza el carrito.`,
        };
      }
    } else if (p.stock < wanted) {
      return {
        ok: false,
        productName: name,
        size: null,
        message: `Sin stock suficiente de "${name}". Actualiza el carrito.`,
      };
    }
    consumed.set(key, wanted);
  }
  return { ok: true };
}
