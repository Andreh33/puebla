"use server";

/**
 * Server actions del panel de pedidos.
 *
 * - syncCatalogToStripe: dispara `syncProductsToStripe`. Solo OWNER.
 * - exportOrdersCsv: descarga CSV de pedidos filtrados.
 *
 * Todas requieren sesión admin.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { OrderStatus, Prisma } from "@prisma/client";
import { syncProductsToStripe, type SyncResult } from "@/lib/stripe/sync-products";
import { getStripe, isStripeConfigured, missingStripeEnv } from "@/lib/stripe/client";
import {
  toOrderDetail,
  restoreStockForOrder,
  STOCK_DEDUCTED_STATUSES,
} from "@/lib/stripe/orders";
import type { OrderDetail } from "@/lib/stripe/types";
import { issueInvoiceForOrder, type FiscalData } from "@/lib/holded/invoice";
import { isHoldedConfigured } from "@/lib/holded/client";
import { performItemReturn } from "@/lib/pos/return-order";
import { performOnlineItemRefund } from "@/lib/pos/refund-online";
import { computeItemReturn } from "@/lib/pos/returns";
import { madridDayStart, madridDayEnd } from "@/lib/dates";
import { methodWhere } from "@/lib/admin/order-method-filter";
import { FULFILLMENT_STATUSES, type FulfillmentStatus } from "./constants";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireOwner() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (session.user.role !== "OWNER") {
    throw new Error("Requiere rol OWNER");
  }
  return session;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export async function getOrderDetail(
  id: string,
): Promise<ActionResult<OrderDetail>> {
  try {
    await requireSession();
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado" };
    return { ok: true, data: toOrderDetail(order) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Emite la factura del pedido en Holded (→ VeriFactu). Con datos fiscales (NIF)
 * sale factura COMPLETA; sin NIF, simplificada. Idempotente: issueInvoiceForOrder
 * no re-emite si el pedido ya tiene factura.
 */
export async function issueInvoiceAction(
  orderId: string,
  fiscal?: FiscalData,
): Promise<ActionResult<{ invoiceNumber: string | null; warning?: string }>> {
  try {
    await requireSession();
    if (!isHoldedConfigured()) {
      return { ok: false, error: "Holded no configurado: falta HOLDED_API_KEY en Vercel." };
    }
    const hasFiscal = !!(fiscal && (fiscal.nif || fiscal.name || fiscal.address));
    const res = await issueInvoiceForOrder(orderId, hasFiscal ? { fiscal } : {});
    if (!res.ok) return { ok: false, error: res.error ?? "No se pudo emitir la factura" };
    revalidatePath("/admin/pedidos");
    return { ok: true, data: { invoiceNumber: res.invoiceNumber ?? null, warning: res.warning } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

// ---------------------------------------------------------------------------
// Cambio de estado de fulfillment (manual desde el admin)
// ---------------------------------------------------------------------------

// FULFILLMENT_STATUSES + el tipo FulfillmentStatus viven en ./constants: un
// módulo "use server" SOLO puede exportar funciones async, nunca valores; si
// no, se rompe el dispatch de TODAS las server actions del fichero (500).

function isFulfillmentStatus(v: string): v is FulfillmentStatus {
  return (FULFILLMENT_STATUSES as readonly string[]).includes(v);
}

/**
 * Cambia el estado de un pedido a uno de fulfillment. Si pasa a CANCELLED y el
 * pedido estaba en un estado que YA había descontado stock (PAID/PROCESSING/
 * SHIPPED/DELIVERED), restaura el stock reutilizando `restoreStockForOrder`
 * (idempotente vía metadata.stockRestored). Si llega una `note`, se anexa a
 * Order.notes con sello de fecha.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
): Promise<ActionResult<{ status: FulfillmentStatus }>> {
  try {
    await requireSession();

    if (!isFulfillmentStatus(status)) {
      return { ok: false, error: `Estado no permitido: ${status}` };
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, notes: true, deliveryMethod: true },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado" };

    // Cancelar con devolución de stock SOLO para ventas del TPV (in_store). La
    // caja física no pasa por Stripe, así que el inventario se corrige aquí. Un
    // pedido online se cancela/reembolsa desde Stripe (charge.refunded), que es
    // quien repone su stock; cancelarlo a mano aquí descuadraría dinero y stock.
    if (status === "CANCELLED" && order.deliveryMethod !== "in_store") {
      return {
        ok: false,
        error:
          "Aquí solo se cancelan ventas del TPV. Un pedido online se cancela reembolsándolo en Stripe, que devuelve el stock automáticamente.",
      };
    }

    // Restaura stock al CANCELAR (TPV) desde un estado que ya lo había
    // descontado. La marca metadata.stockRestored evita doble restauración.
    if (status === "CANCELLED" && STOCK_DEDUCTED_STATUSES.has(order.status)) {
      await restoreStockForOrder(order.id);
    }

    const trimmedNote = note?.trim();
    let notes = order.notes;
    if (trimmedNote) {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const line = `[${stamp} · ${status}] ${trimmedNote}`;
      notes = notes ? `${notes}\n${line}` : line;
    }

    await db.order.update({
      where: { id: orderId },
      data: { status, ...(trimmedNote ? { notes } : {}) },
    });

    revalidatePath("/admin/pedidos");
    return { ok: true, data: { status } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Devuelve UN artículo (o varias unidades de una línea) de una venta de TPV:
 * repone su stock al inventario, lo descuenta del total del pedido y lo registra
 * en `metadata.returns` + notas. SOLO ventas de tienda (`in_store`): no toca
 * Stripe ni Holded. Todo en una transacción atómica vía `performItemReturn`. Si
 * se devuelve la última unidad del pedido, este queda CANCELLED. El balance
 * netea solo (lee los totales/líneas ya reducidos).
 */
export async function returnOrderItem(
  orderId: string,
  itemId: string,
  qty: number,
): Promise<ActionResult<{ status: OrderStatus; refundedAmount: number; warning?: string }>> {
  try {
    await requireSession();
    const res = await db.$transaction((tx) =>
      performItemReturn(tx, { orderId, itemId, qty }),
    );
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/productos");
    revalidatePath("/admin/balance");
    return {
      ok: true,
      data: { status: res.status, refundedAmount: res.refundedAmount, warning: res.warning },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/** Suma de unidades ya reembolsadas de una línea (según metadata.returns), para
 *  construir una idempotency-key determinista y no reembolsar de más. */
function priorReturnedQty(metadata: unknown, itemId: string): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 0;
  const returns = (metadata as Record<string, unknown>).returns;
  if (!Array.isArray(returns)) return 0;
  return returns.reduce((sum, r) => {
    if (r && typeof r === "object" && (r as Record<string, unknown>).itemId === itemId) {
      const q = Number((r as Record<string, unknown>).qty);
      return sum + (Number.isFinite(q) ? q : 0);
    }
    return sum;
  }, 0);
}

/**
 * Reembolsa por Stripe el importe de `qty` unidades de UNA línea de un pedido
 * ONLINE y contabiliza la operación (baja de línea, reposición opcional de
 * stock, reducción de totales, registro). Solo pedidos con pago Stripe y NO de
 * TPV. El refund se crea con idempotency-key determinista (anti doble-clic).
 *
 * Orden: primero Stripe (fuente de la verdad del dinero); solo tras su OK se
 * escribe en BD. Si la BD fallara tras el refund, se avisa con el id del refund
 * para reconciliar a mano (el webhook charge.refunded parcial es no-op aposta).
 */
export async function refundOnlineItem(
  orderId: string,
  itemId: string,
  qty: number,
  restock: boolean,
): Promise<ActionResult<{ status: OrderStatus; refundedAmount: number; warning?: string }>> {
  try {
    await requireSession();

    const stripe = getStripe();
    if (!stripe) {
      return { ok: false, error: `Stripe no configurado. Faltan: ${missingStripeEnv().join(", ")}` };
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        stripePaymentIntentId: true,
        metadata: true,
        items: { select: { id: true, quantity: true, subtotal: true, productName: true } },
      },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado." };
    if (order.deliveryMethod === "in_store") {
      return { ok: false, error: 'Este pedido es de tienda (TPV): usa «Devolver», no el reembolso online.' };
    }
    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return { ok: false, error: "El pedido ya está cancelado o reembolsado." };
    }
    if (!order.stripePaymentIntentId) {
      return { ok: false, error: "Este pedido no tiene pago de Stripe asociado; no se puede reembolsar automáticamente." };
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: "La línea no pertenece a este pedido." };
    if (!Number.isInteger(qty) || qty < 1) return { ok: false, error: "Cantidad a reembolsar inválida." };
    if (qty > item.quantity) {
      return { ok: false, error: `Solo quedan ${item.quantity} unidad(es) por reembolsar de "${item.productName}".` };
    }

    const { returnedGross } = computeItemReturn(Number(item.subtotal), item.quantity, qty);
    const amountCents = Math.round(returnedGross * 100);
    if (amountCents <= 0) return { ok: false, error: "Importe a reembolsar inválido (0 €)." };

    // Idempotency-key determinista por estado: dos clics con el mismo estado
    // producen la misma clave → Stripe devuelve el MISMO refund (no cobra doble).
    const idemKey = `zs_refund_${orderId}_${itemId}_${priorReturnedQty(order.metadata, itemId) + qty}`;

    let refundId: string;
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: amountCents,
          reason: "requested_by_customer",
          metadata: { orderId, itemId, qty: String(qty) },
        },
        { idempotencyKey: idemKey },
      );
      refundId = refund.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "error desconocido";
      return { ok: false, error: `Stripe no pudo procesar el reembolso: ${message}` };
    }

    // El dinero ya se devolvió: ahora la contabilidad en BD.
    try {
      const res = await db.$transaction((tx) =>
        performOnlineItemRefund(tx, { orderId, itemId, qty, restock, stripeRefundId: refundId }),
      );
      revalidatePath("/admin/pedidos");
      revalidatePath("/admin/productos");
      revalidatePath("/admin/balance");
      return { ok: true, data: { status: res.status, refundedAmount: res.refundedAmount, warning: res.warning } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      return {
        ok: false,
        error: `El dinero se reembolsó en Stripe (${refundId}), pero falló el registro en la web: ${message}. Anota el id y revisa el pedido.`,
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export async function syncCatalogToStripe(): Promise<ActionResult<SyncResult>> {
  try {
    await requireOwner();
    if (!isStripeConfigured()) {
      return {
        ok: false,
        error: `Stripe no configurado. Faltan: ${missingStripeEnv().join(", ")}`,
      };
    }
    const result = await syncProductsToStripe({ limit: 1000 });
    revalidatePath("/admin/pedidos");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export interface ExportOrdersFilters {
  q?: string;
  status?: OrderStatus | "ALL";
  /** Filtro por método de pago (valores de PAYMENT_METHOD_FILTER_OPTIONS). */
  method?: string;
  from?: string;
  to?: string;
}

export async function exportOrdersCsv(
  filters: ExportOrdersFilters = {},
): Promise<ActionResult<{ filename: string; csv: string }>> {
  try {
    await requireSession();

    const where: Prisma.OrderWhereInput = {};
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.q) {
      where.OR = [
        { customerEmail: { contains: filters.q, mode: "insensitive" } },
        { customerName: { contains: filters.q, mode: "insensitive" } },
        { stripeSessionId: { contains: filters.q } },
        { stripePaymentIntentId: { contains: filters.q } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      // Límites en hora de la tienda (Madrid), coherente con el listado.
      if (filters.from) where.createdAt.gte = madridDayStart(filters.from);
      if (filters.to) where.createdAt.lte = madridDayEnd(filters.to);
    }
    // Método de pago: en AND para no pisar el OR de la búsqueda por texto.
    const mw = filters.method ? methodWhere(filters.method) : null;
    if (mw) where.AND = [mw];

    const rows = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        id: true,
        createdAt: true,
        status: true,
        deliveryMethod: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        subtotal: true,
        shippingCost: true,
        tax: true,
        total: true,
        currency: true,
        stripeSessionId: true,
        stripePaymentIntentId: true,
      },
    });

    const header = [
      "id",
      "fecha",
      "estado",
      "envio",
      "cliente",
      "email",
      "telefono",
      "subtotal",
      "envio_eur",
      "iva",
      "total",
      "moneda",
      "session_id",
      "payment_intent_id",
    ];

    const esc = (v: unknown) => {
      let s = v == null ? "" : String(v);
      // Anti-inyección de fórmulas: nombre/email/teléfono vienen del cliente vía
      // Stripe; una celda que empieza por = + - @ tab/CR se ejecutaría al abrir
      // el CSV en Excel/LibreOffice. La neutralizamos con un apóstrofo delante.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.createdAt.toISOString(),
          r.status,
          r.deliveryMethod ?? "",
          r.customerName ?? "",
          r.customerEmail ?? "",
          r.customerPhone ?? "",
          r.subtotal.toString(),
          r.shippingCost.toString(),
          r.tax.toString(),
          r.total.toString(),
          r.currency,
          r.stripeSessionId ?? "",
          r.stripePaymentIntentId ?? "",
        ]
          .map(esc)
          .join(","),
      );
    }

    return {
      ok: true,
      data: {
        filename: `zonasport-pedidos-${new Date().toISOString().slice(0, 10)}.csv`,
        csv: lines.join("\n"),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}
