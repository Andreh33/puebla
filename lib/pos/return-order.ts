import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { recomputeProductStock } from "@/lib/products/stock";
import { readPosOpenItemKind } from "@/lib/pos/open-items";
import { computeItemReturn } from "./returns";

/** Convierte Prisma.Decimal | string | number a number (tolerante a null/NaN). */
function toNum(d: unknown): number {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  if (d == null) return 0;
  if (typeof d === "number") return safe(d);
  if (typeof d === "string") return safe(Number(d));
  if (typeof d === "object") {
    const obj = d as { toString?: () => string };
    if (typeof obj.toString === "function") return safe(Number(obj.toString()));
  }
  return 0;
}

export type ItemReturnResult = {
  status: OrderStatus;
  /** Bruto (IVA incl.) devuelto: lo que hay que entregar al cliente. */
  refundedAmount: number;
  /** false si el producto/talla ya no existía y no se pudo reponer stock. */
  stockRestored: boolean;
  /** Aviso no fatal (p. ej. stock no repuesto por producto inexistente). */
  warning?: string;
};

/**
 * Devuelve `qty` unidades de UNA línea de una venta de tienda (TPV), DENTRO de
 * una transacción `tx`. Es el núcleo testeable de la server action
 * `returnOrderItem`. Hace, de forma atómica:
 *
 *  1. Valida: el pedido es de TPV (`in_store`), no está CANCELLED/REFUNDED, la
 *     línea le pertenece y `1 ≤ qty ≤ unidades restantes`.
 *  2. Decrementa la línea con guarda condicional (`quantity >= qty`) → impide
 *     devolver dos veces lo mismo bajo carrera/doble clic.
 *  3. Repone al inventario el stock de esa línea (talla o producto) y recalcula
 *     el agregado. NO marca `metadata.stockRestored` (esa marca es de la
 *     cancelación de pedido COMPLETO; reservarla evita bloquear "Cancelar venta").
 *  4. Reduce los totales del pedido (modelo IVA-incluido) restando el bruto
 *     devuelto y su desglose base/IVA → el panel de balance netea solo.
 *  5. Registra la devolución en `metadata.returns` + una nota con sello de fecha.
 *  6. Si tras devolver no queda ninguna unidad, marca el pedido CANCELLED y
 *     pone los totales a 0 (la venta queda anulada por completo).
 *
 * Lanza Error con mensaje claro ante cualquier validación fallida (la server
 * action lo traduce a `{ ok: false, error }`). NO toca Stripe ni Holded.
 */
export async function performItemReturn(
  tx: Prisma.TransactionClient,
  params: { orderId: string; itemId: string; qty: number },
): Promise<ItemReturnResult> {
  const { orderId, itemId, qty } = params;

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      notes: true,
      metadata: true,
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          metadata: true,
          variantSize: true,
          quantity: true,
          subtotal: true,
        },
      },
    },
  });

  if (!order) throw new Error("Pedido no encontrado.");
  if (order.deliveryMethod !== "in_store") {
    throw new Error(
      "Aquí solo se devuelven artículos de ventas de tienda (TPV). Un pedido online se reembolsa en Stripe.",
    );
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    throw new Error("El pedido ya está cancelado o reembolsado.");
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) throw new Error("La línea no pertenece a este pedido.");
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("Cantidad a devolver inválida.");
  }
  if (qty > item.quantity) {
    throw new Error(
      `Solo queda${item.quantity === 1 ? "" : "n"} ${item.quantity} unidad${item.quantity === 1 ? "" : "es"} por devolver de "${item.productName}".`,
    );
  }
  const isOpenItem = readPosOpenItemKind(item.metadata) != null;

  const { returnedGross, retBase, retTax } = computeItemReturn(
    toNum(item.subtotal),
    item.quantity,
    qty,
  );

  // Decremento ATÓMICO de la línea (guarda condicional): si otra ejecución ya
  // bajó la cantidad por debajo de `qty`, count===0 y abortamos sin tocar stock.
  const dec = await tx.orderItem.updateMany({
    where: { id: itemId, orderId, quantity: { gte: qty } },
    data: { quantity: { decrement: qty }, subtotal: { decrement: returnedGross } },
  });
  if (dec.count === 0) {
    throw new Error("No se pudo devolver: la cantidad ya no está disponible (¿devuelto a la vez?).");
  }

  // Reposición de stock SOLO de esta línea.
  let stockRestored = true;
  if (item.productId) {
    if (item.variantSize) {
      const r = await tx.productSize.updateMany({
        where: { productId: item.productId, size: item.variantSize },
        data: { stock: { increment: qty } },
      });
      if (r.count === 0) stockRestored = false;
    } else {
      const r = await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      });
      if (r.count === 0) stockRestored = false;
    }
    if (stockRestored) await recomputeProductStock(tx, item.productId);
  } else if (!isOpenItem) {
    stockRestored = false; // sin productId no hay inventario que reponer (no esperado en TPV)
  }

  // ¿Queda algo del pedido? (la línea ya está decrementada en BD).
  const agg = await tx.orderItem.aggregate({
    where: { orderId },
    _sum: { quantity: true },
  });
  const fullyReturned = (agg._sum.quantity ?? 0) <= 0;

  // Registro: metadata.returns (append) + nota con sello de fecha.
  const meta =
    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};
  const prevReturns = Array.isArray(meta.returns) ? (meta.returns as unknown[]) : [];
  const returnEntry = {
    itemId,
    productName: item.productName,
    variantSize: item.variantSize,
    qty,
    amount: returnedGross,
    at: new Date().toISOString(),
  };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const sizeLabel = item.variantSize ? ` (talla ${item.variantSize})` : "";
  const noteLine = `[${stamp} · DEVOLUCIÓN] ${qty}× ${item.productName}${sizeLabel} · ${returnedGross.toFixed(2)} €`;
  const notes = order.notes ? `${order.notes}\n${noteLine}` : noteLine;

  if (fullyReturned) {
    // Todo devuelto → venta anulada: totales a 0 y estado CANCELLED. El stock ya
    // está repuesto línea a línea; marcamos stockRestored para que cualquier
    // "Cancelar venta" posterior no intente reponer de nuevo.
    await tx.order.update({
      where: { id: orderId },
      data: {
        total: 0,
        subtotal: 0,
        tax: 0,
        status: "CANCELLED",
        notes,
        metadata: { ...meta, returns: [...prevReturns, returnEntry], stockRestored: true } as Prisma.InputJsonValue,
      },
    });
    return {
      status: "CANCELLED",
      refundedAmount: returnedGross,
      stockRestored,
      warning: stockRestored
        ? undefined
        : "El producto ya no existe en el catálogo: la venta se ha corregido, pero no se ha repuesto stock.",
    };
  }

  // Devolución parcial: resta el bruto y su desglose. NO toca stockRestored.
  await tx.order.update({
    where: { id: orderId },
    data: {
      total: { decrement: returnedGross },
      subtotal: { decrement: retBase },
      tax: { decrement: retTax },
      notes,
      metadata: { ...meta, returns: [...prevReturns, returnEntry] } as Prisma.InputJsonValue,
    },
  });

  return {
    status: order.status,
    refundedAmount: returnedGross,
    stockRestored,
    warning: stockRestored
      ? undefined
      : "El producto ya no existe en el catálogo: la venta se ha corregido, pero no se ha repuesto stock.",
  };
}
