import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { recomputeProductStock } from "@/lib/products/stock";
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

export type OnlineRefundResult = {
  status: OrderStatus;
  /** Bruto (IVA incl.) reembolsado por esta operación. */
  refundedAmount: number;
  /** true si se repuso stock de esta línea (según `restock` y existencia). */
  stockRestored: boolean;
  /** true si el reembolso agotó el pedido (todas las unidades reembolsadas). */
  fullyRefunded: boolean;
  /** true si este stripeRefundId ya estaba registrado (no se aplicó de nuevo). */
  alreadyApplied: boolean;
  /** Aviso no fatal (p. ej. stock no repuesto por producto inexistente). */
  warning?: string;
};

/**
 * Contabiliza en BD el reembolso de `qty` unidades de UNA línea de un pedido
 * ONLINE, DENTRO de una transacción `tx`. Se ejecuta DESPUÉS de que Stripe haya
 * confirmado el refund (su id llega en `stripeRefundId`). Hace, de forma atómica:
 *
 *  1. Valida: el pedido es online (NO `in_store`), no está CANCELLED/REFUNDED,
 *     la línea le pertenece y `1 ≤ qty ≤ unidades restantes`.
 *  2. Idempotencia: si `metadata.returns` ya contiene este `stripeRefundId`, no
 *     vuelve a aplicar nada (protege ante reintentos / doble webhook).
 *  3. Decrementa la línea con guarda condicional (`quantity >= qty`).
 *  4. Si `restock`, repone al inventario el stock de esa línea (talla o
 *     producto) y recalcula el agregado. Si no, deja el stock intacto.
 *  5. Reduce los totales del pedido (modelo IVA-incluido) restando el bruto
 *     reembolsado y su desglose base/IVA → el balance netea solo.
 *  6. Registra el reembolso en `metadata.returns` (con `channel:"online"` y el
 *     `stripeRefundId`) + una nota con sello de fecha.
 *  7. Si tras reembolsar no queda ninguna unidad, marca el pedido REFUNDED y
 *     pone los totales a 0 (pedido totalmente reembolsado).
 *
 * Lanza Error con mensaje claro ante cualquier validación fallida. NO llama a
 * Stripe (eso lo hace la server action antes de abrir la transacción).
 */
export async function performOnlineItemRefund(
  tx: Prisma.TransactionClient,
  params: { orderId: string; itemId: string; qty: number; restock: boolean; stripeRefundId: string },
): Promise<OnlineRefundResult> {
  const { orderId, itemId, qty, restock, stripeRefundId } = params;

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
          variantSize: true,
          quantity: true,
          subtotal: true,
        },
      },
    },
  });

  if (!order) throw new Error("Pedido no encontrado.");
  if (order.deliveryMethod === "in_store") {
    throw new Error('Este pedido es de tienda (TPV): usa «Devolver», no el reembolso online.');
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    throw new Error("El pedido ya está cancelado o reembolsado.");
  }

  const meta =
    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};
  const prevReturns = Array.isArray(meta.returns) ? (meta.returns as Record<string, unknown>[]) : [];

  // Idempotencia: si ya registramos este refund, no lo aplicamos de nuevo.
  if (prevReturns.some((r) => r && r.stripeRefundId === stripeRefundId)) {
    return {
      status: order.status,
      refundedAmount: 0,
      stockRestored: false,
      fullyRefunded: false,
      alreadyApplied: true,
    };
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) throw new Error("La línea no pertenece a este pedido.");
  if (!Number.isInteger(qty) || qty < 1) throw new Error("Cantidad a reembolsar inválida.");
  if (qty > item.quantity) {
    throw new Error(
      `Solo queda${item.quantity === 1 ? "" : "n"} ${item.quantity} unidad${item.quantity === 1 ? "" : "es"} por reembolsar de "${item.productName}".`,
    );
  }

  const { returnedGross, retBase, retTax } = computeItemReturn(
    toNum(item.subtotal),
    item.quantity,
    qty,
  );

  // Decremento ATÓMICO de la línea (guarda condicional).
  const dec = await tx.orderItem.updateMany({
    where: { id: itemId, orderId, quantity: { gte: qty } },
    data: { quantity: { decrement: qty }, subtotal: { decrement: returnedGross } },
  });
  if (dec.count === 0) {
    throw new Error("No se pudo reembolsar: la cantidad ya no está disponible (¿acción repetida?).");
  }

  // Reposición de stock SOLO de esta línea, si el operador lo pidió.
  let stockRestored = false;
  if (restock && item.productId) {
    stockRestored = true;
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
  }

  // ¿Queda algo del pedido? (la línea ya está decrementada en BD).
  const agg = await tx.orderItem.aggregate({ where: { orderId }, _sum: { quantity: true } });
  const fullyRefunded = (agg._sum.quantity ?? 0) <= 0;

  const returnEntry = {
    itemId,
    productName: item.productName,
    variantSize: item.variantSize,
    qty,
    amount: returnedGross,
    at: new Date().toISOString(),
    channel: "online",
    stripeRefundId,
    restocked: stockRestored,
  };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const sizeLabel = item.variantSize ? ` (talla ${item.variantSize})` : "";
  const noteLine = `[${stamp} · REEMBOLSO STRIPE] ${qty}× ${item.productName}${sizeLabel} · ${returnedGross.toFixed(2)} €${stockRestored ? "" : " · sin reponer stock"}`;
  const notes = order.notes ? `${order.notes}\n${noteLine}` : noteLine;

  const warning =
    restock && item.productId && !stockRestored
      ? "El producto ya no existe en el catálogo: se reembolsó el dinero, pero no se ha repuesto stock."
      : undefined;

  if (fullyRefunded) {
    // Todo reembolsado → pedido REFUNDED y totales a 0. Solo marcamos
    // stockRestored del pedido entero si de verdad repusimos todo (restock);
    // así un evento posterior no intenta reponer lo que el cliente conserva.
    await tx.order.update({
      where: { id: orderId },
      data: {
        total: 0,
        subtotal: 0,
        tax: 0,
        status: "REFUNDED",
        paymentStatus: "refunded",
        notes,
        metadata: {
          ...meta,
          returns: [...prevReturns, returnEntry],
          ...(restock ? { stockRestored: true } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    return { status: "REFUNDED", refundedAmount: returnedGross, stockRestored, fullyRefunded: true, alreadyApplied: false, warning };
  }

  // Reembolso parcial: resta el bruto y su desglose, conserva el estado.
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

  return { status: order.status, refundedAmount: returnedGross, stockRestored, fullyRefunded: false, alreadyApplied: false, warning };
}
