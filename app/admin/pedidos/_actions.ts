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
import { isStripeConfigured, missingStripeEnv } from "@/lib/stripe/client";
import {
  toOrderDetail,
  restoreStockForOrder,
  STOCK_DEDUCTED_STATUSES,
} from "@/lib/stripe/orders";
import type { OrderDetail } from "@/lib/stripe/types";
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
      select: { id: true, status: true, notes: true },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado" };

    // Restaura stock solo al CANCELAR desde un estado que ya lo había descontado.
    // La marca metadata.stockRestored evita doble restauración (idempotente).
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
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

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
