import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Recalcula Product.stock = suma de ProductSize.stock (si el producto tiene
 * tallas). Para productos sin tallas (simple), deja Product.stock como está.
 * Si tras el recálculo el stock total <= 0 y el producto está ACTIVE, lo pasa a
 * DRAFT (regla del cliente: sin stock = fuera de la tienda). Devuelve el nuevo
 * stock total y si se ocultó.
 *
 * IMPORTANTE: solo OCULTA (ACTIVE→DRAFT). Nunca re-publica: un producto que
 * recupera stock se reactiva a mano (editor o bulk). Así un refund de algo
 * agotado NO lo devuelve solo a la tienda.
 */
export async function recomputeProductStock(
  tx: Tx,
  productId: string,
): Promise<{ total: number; hidden: boolean }> {
  const sizes = await tx.productSize.aggregate({
    where: { productId },
    _sum: { stock: true },
    _count: { _all: true },
  });
  const hasSizes = sizes._count._all > 0;
  const prod = await tx.product.findUnique({
    where: { id: productId },
    select: { stock: true, status: true },
  });
  if (!prod) return { total: 0, hidden: false };
  const total = hasSizes ? (sizes._sum.stock ?? 0) : prod.stock;
  const data: Prisma.ProductUpdateInput = {};
  if (hasSizes) data.stock = total; // sincroniza el agregado
  let hidden = false;
  if (total <= 0 && prod.status === "ACTIVE") {
    data.status = "DRAFT";
    hidden = true;
  }
  if (Object.keys(data).length) {
    await tx.product.update({ where: { id: productId }, data });
  }
  return { total, hidden };
}
