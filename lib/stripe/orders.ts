/**
 * Helpers de persistencia de pedidos a partir de webhooks Stripe.
 *
 * El webhook valida la firma y delega aquí toda la lógica de DB:
 *   - createOrderFromCheckout(session) → INSERT Order + OrderItem[]
 *   - markOrderRefunded(charge) → UPDATE status=REFUNDED
 *   - markOrderCancelled(intent) → UPDATE status=CANCELLED
 *
 * Idempotente: si un evento llega 2 veces, no crea pedidos duplicados
 * (gracias al @unique en `stripeSessionId` y `stripePaymentIntentId`).
 */

import "server-only";
import type Stripe from "stripe";
import { Prisma, type Order } from "@prisma/client";
import { db } from "@/lib/db";
import { recomputeProductStock } from "@/lib/products/stock";
import { getStripe } from "./client";
import type { OrderDetail, OrderSummary, ShippingAddress } from "./types";

/**
 * Convierte céntimos de Stripe a Decimal con 2 decimales (EUR).
 */
function fromCents(amount: number | null | undefined): Prisma.Decimal {
  if (!amount || !Number.isFinite(amount)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(amount).div(100).toDecimalPlaces(2);
}

/**
 * Acepta Decimal de Prisma, DecimalJsLike (forma estructural usada en *Input
 * types) o primitivos. Devuelve siempre un `number`.
 */
function decToNumber(d: unknown): number {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  if (d == null) return 0;
  if (typeof d === "number") return safe(d);
  if (typeof d === "string") return safe(Number(d));
  if (typeof d === "object" && d !== null) {
    // Prisma.Decimal y DecimalJsLike exponen toString() o toFixed()
    const obj = d as { toString?: () => string; toFixed?: () => string };
    if (typeof obj.toString === "function") return safe(Number(obj.toString()));
    if (typeof obj.toFixed === "function") return safe(Number(obj.toFixed()));
  }
  return 0;
}

/**
 * Reconstruye los OrderItem a partir de los `line_items` expandidos de la
 * Checkout Session. Cada line item tiene asociado un Price → Product de
 * Stripe; intentamos resolver el `zs_product_id` desde metadata.
 */
function buildItemsFromSession(
  session: Stripe.Checkout.Session,
): Prisma.OrderItemCreateWithoutOrderInput[] {
  const lineItems = session.line_items?.data ?? [];
  return lineItems.map((li) => {
    const price = li.price as Stripe.Price | null;
    const product = (price?.product as Stripe.Product | null) ?? null;
    const metadata = (product?.metadata ?? {}) as Record<string, string>;
    const unitAmount = price?.unit_amount ?? 0;
    const qty = li.quantity ?? 1;
    return {
      productId: metadata.zs_product_id || null,
      productSlug: metadata.zs_slug || null,
      productName: li.description ?? product?.name ?? "Producto",
      productSku: metadata.zs_sku || null,
      variantSize: metadata.zs_size || null,
      unitPrice: fromCents(unitAmount),
      quantity: qty,
      subtotal: fromCents(unitAmount * qty),
      metadata: metadata as unknown as Prisma.InputJsonValue,
    } satisfies Prisma.OrderItemCreateWithoutOrderInput;
  });
}

function extractShippingAddress(
  session: Stripe.Checkout.Session,
): Prisma.InputJsonValue | undefined {
  // En la API actual, shipping_details vive bajo collected_information.
  const details = session.collected_information?.shipping_details ?? null;
  if (!details) return undefined;
  const addr = details.address;
  if (!addr) return undefined;
  return {
    name: details.name ?? null,
    phone: session.customer_details?.phone ?? null,
    line1: addr.line1 ?? null,
    line2: addr.line2 ?? null,
    city: addr.city ?? null,
    postal_code: addr.postal_code ?? null,
    state: addr.state ?? null,
    country: addr.country ?? null,
  } as Prisma.InputJsonValue;
}

/**
 * Crea un Order a partir de una Checkout Session completada. Si ya existe
 * un Order con ese stripeSessionId, no hace nada (idempotente).
 */
export async function createOrderFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<Order | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  // Si el line_items no viene expandido (cosa habitual en webhooks), lo
  // pedimos a la API por separado para tener nombre/precio.
  let expandedSession = session;
  if (!session.line_items) {
    expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product", "payment_intent"],
    });
  }

  const existing = await db.order.findUnique({
    where: { stripeSessionId: expandedSession.id },
  });
  if (existing) return existing;

  const items = buildItemsFromSession(expandedSession);

  // Congelar el coste unitario (margen histórico). No viene en la metadata de
  // Stripe, así que lo resolvemos de la BD: ProductSize.costPrice de la talla si
  // la hay, si no Product.costPrice. Se hace en bloque para no abrir N queries.
  await fillUnitCosts(items);
  // Subtotal en cntimos ENTEROS directamente desde Stripe (`amount_subtotal`
  // por lnea ya viene en cntimos). Evita el round-trip Decimal-euros → float
  // que reintroduca error de coma flotante (19.99*100 = 1998.9999…).
  const subtotalCents = (expandedSession.line_items?.data ?? []).reduce(
    (acc, li) => acc + (li.amount_subtotal ?? 0),
    0,
  );
  const totalCents = expandedSession.amount_total ?? subtotalCents;
  const shippingCents = expandedSession.shipping_cost?.amount_total ?? 0;
  const taxCents = expandedSession.total_details?.amount_tax ?? 0;

  const paymentIntentId =
    typeof expandedSession.payment_intent === "string"
      ? expandedSession.payment_intent
      : (expandedSession.payment_intent?.id ?? null);

  const customerId =
    typeof expandedSession.customer === "string"
      ? expandedSession.customer
      : (expandedSession.customer?.id ?? null);

  const shippingDetails =
    expandedSession.collected_information?.shipping_details ?? null;
  const deliveryMethod =
    (expandedSession.metadata?.deliveryMethod as string | undefined) ??
    (shippingDetails ? "shipping" : "pickup");

  const baseMetadata = (expandedSession.metadata ?? {}) as Record<string, unknown>;

  // Order + descuento de stock en UNA transacción atómica. El descuento usa una
  // guarda condicional (`stock >= qty`) para no permitir sobreventa bajo carrera.
  // Si la carrera ya agotó el stock tras el cobro NO abortamos (el dinero ya
  // entró): registramos la línea en metadata.oversold para resolución manual.
  try {
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          stripeSessionId: expandedSession.id,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: customerId,
          customerName:
            expandedSession.customer_details?.name ?? shippingDetails?.name ?? null,
          customerEmail: expandedSession.customer_details?.email ?? null,
          customerPhone: expandedSession.customer_details?.phone ?? null,
          shippingAddress: extractShippingAddress(expandedSession),
          subtotal: fromCents(subtotalCents),
          shippingCost: fromCents(shippingCents),
          tax: fromCents(taxCents),
          total: fromCents(totalCents),
          currency: (expandedSession.currency ?? "eur").toUpperCase(),
          status: "PAID",
          paymentStatus: expandedSession.payment_status ?? null,
          deliveryMethod,
          metadata: baseMetadata as Prisma.InputJsonValue,
          items: { create: items },
        },
      });

      // Descuento condicional + recompute. Acumula líneas sin stock (carrera).
      const oversold: Array<{ productId: string; size: string | null; qty: number }> =
        [];
      const affected = new Set<string>();
      for (const it of items) {
        if (!it.productId) continue;
        affected.add(it.productId);
        if (it.variantSize) {
          const res = await tx.productSize.updateMany({
            where: {
              productId: it.productId,
              size: it.variantSize,
              stock: { gte: it.quantity },
            },
            data: { stock: { decrement: it.quantity } },
          });
          if (res.count === 0) {
            oversold.push({
              productId: it.productId,
              size: it.variantSize,
              qty: it.quantity,
            });
          }
        } else {
          const res = await tx.product.updateMany({
            where: { id: it.productId, stock: { gte: it.quantity } },
            data: { stock: { decrement: it.quantity } },
          });
          if (res.count === 0) {
            oversold.push({ productId: it.productId, size: null, qty: it.quantity });
          }
        }
        // Clamp defensivo a >= 0 por si quedó algo negativo de un estado previo.
        await tx.productSize.updateMany({
          where: { productId: it.productId, stock: { lt: 0 } },
          data: { stock: 0 },
        });
        await tx.product.updateMany({
          where: { id: it.productId, stock: { lt: 0 } },
          data: { stock: 0 },
        });
      }

      // Sincroniza Product.stock (suma de tallas) y oculta a DRAFT si llegó a 0.
      for (const productId of affected) {
        await recomputeProductStock(tx, productId);
      }

      // Si hubo sobreventa, deja constancia en el pedido (no rompe la venta).
      if (oversold.length) {
        await tx.order.update({
          where: { id: created.id },
          data: {
            metadata: { ...baseMetadata, oversold } as Prisma.InputJsonValue,
          },
        });
      }

      return created;
    });

    return order;
  } catch (e) {
    // Carrera entre dos webhooks: el otro ya creó el Order con este
    // stripeSessionId/paymentIntentId. Tratar P2002 como éxito (devolver el
    // existente) para que el webhook acabe en 200 y Stripe no reintente.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await db.order.findUnique({
        where: { stripeSessionId: expandedSession.id },
      });
      if (winner) return winner;
    }
    throw e;
  }
}

/**
 * Resuelve y congela el coste unitario de cada item con productId. Lee
 * ProductSize.costPrice (si hay talla) o Product.costPrice. Muta los items
 * añadiendo `unitCost` (Decimal). Hace como mucho 2 queries (productos + tallas).
 */
async function fillUnitCosts(
  items: Prisma.OrderItemCreateWithoutOrderInput[],
): Promise<void> {
  const productIds = [
    ...new Set(items.map((it) => it.productId).filter((id): id is string => !!id)),
  ];
  if (!productIds.length) return;

  const [products, sizes] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    }),
    db.productSize.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, size: true, costPrice: true },
    }),
  ]);
  const productCost = new Map(products.map((p) => [p.id, p.costPrice]));
  const sizeCost = new Map(
    sizes.map((s) => [`${s.productId}::${s.size}`, s.costPrice]),
  );

  for (const it of items) {
    if (!it.productId) continue;
    const fromSize = it.variantSize
      ? sizeCost.get(`${it.productId}::${it.variantSize}`)
      : undefined;
    const cost = fromSize ?? productCost.get(it.productId) ?? null;
    if (cost != null) it.unitCost = cost;
  }
}

// Estados en los que el stock YA se descontó (creación con status=PAID, o
// avances de fulfillment). Solo desde estos hay que restaurar al revertir.
export const STOCK_DEDUCTED_STATUSES: ReadonlySet<Order["status"]> = new Set([
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]);

/**
 * Restaura el stock de un pedido (increment por talla/producto) y recalcula el
 * agregado, en una sola transacción. Idempotente vía marca metadata.stockRestored:
 * si ya se restauró antes, no duplica. El recompute solo OCULTA (nunca republica),
 * así que un producto que quedó agotado sigue en DRAFT tras devolverle unidades.
 */
export async function restoreStockForOrder(orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { metadata: true, items: { select: { productId: true, variantSize: true, quantity: true } } },
    });
    if (!order) return;
    const meta = (order.metadata as Record<string, unknown> | null) ?? {};
    if (meta.stockRestored === true) return; // ya restaurado

    const affected = new Set<string>();
    for (const it of order.items) {
      if (!it.productId) continue;
      affected.add(it.productId);
      if (it.variantSize) {
        await tx.productSize.updateMany({
          where: { productId: it.productId, size: it.variantSize },
          data: { stock: { increment: it.quantity } },
        });
      } else {
        await tx.product.updateMany({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
      }
    }
    for (const productId of affected) {
      await recomputeProductStock(tx, productId);
    }
    await tx.order.update({
      where: { id: orderId },
      data: { metadata: { ...meta, stockRestored: true } as Prisma.InputJsonValue },
    });
  });
}

/** Marca el Order como REFUNDED a partir de un charge.refunded de Stripe. */
export async function markOrderRefunded(charge: Stripe.Charge): Promise<Order | null> {
  const intentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!intentId) return null;

  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: intentId },
  });
  if (!order) return null;

  // Idempotente: si ya estaba REFUNDED, no re-restaurar ni re-marcar.
  if (order.status === "REFUNDED") return order;

  // Restaura stock SOLO si el pedido había descontado (estaba en un estado
  // post-pago). La marca metadata.stockRestored evita restaurar dos veces.
  if (STOCK_DEDUCTED_STATUSES.has(order.status)) {
    await restoreStockForOrder(order.id);
  }

  return db.order.update({
    where: { id: order.id },
    data: { status: "REFUNDED", paymentStatus: "refunded" },
  });
}

/** Marca el Order como CANCELLED a partir de un payment_intent.payment_failed. */
export async function markOrderCancelled(
  intent: Stripe.PaymentIntent,
): Promise<Order | null> {
  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: intent.id },
  });
  // Si no había Order creado todavía (el flujo falló antes del completed),
  // no hay nada que cancelar. No es un error.
  if (!order) return null;

  if (order.status === "CANCELLED") return order; // idempotente

  // Si el pedido ya había descontado stock (PAID/PROCESSING/…), restaurar.
  // Si estaba PENDING (sin descuento), no tocar stock.
  if (STOCK_DEDUCTED_STATUSES.has(order.status)) {
    await restoreStockForOrder(order.id);
  }

  return db.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      paymentStatus: intent.status,
    },
  });
}

// ---------------------------------------------------------------------------
// Serializadores para la UI
// ---------------------------------------------------------------------------

type OrderWithCount = Prisma.OrderGetPayload<{
  include: { _count: { select: { items: true } } };
}>;

export function toOrderSummary(o: OrderWithCount): OrderSummary {
  return {
    id: o.id,
    stripeSessionId: o.stripeSessionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    subtotal: decToNumber(o.subtotal),
    shippingCost: decToNumber(o.shippingCost),
    tax: decToNumber(o.tax),
    total: decToNumber(o.total),
    currency: o.currency,
    status: o.status,
    paymentStatus: o.paymentStatus,
    deliveryMethod: o.deliveryMethod,
    itemCount: o._count.items,
    oversold: hasOversold(o.metadata),
    createdAt: o.createdAt,
  };
}

/** true si metadata.oversold es un array no vacío (líneas vendidas sin stock). */
function hasOversold(metadata: Prisma.JsonValue | null): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  const o = (metadata as Record<string, unknown>).oversold;
  return Array.isArray(o) && o.length > 0;
}

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

export function toOrderDetail(o: OrderWithItems): OrderDetail {
  return {
    id: o.id,
    stripeSessionId: o.stripeSessionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    subtotal: decToNumber(o.subtotal),
    shippingCost: decToNumber(o.shippingCost),
    tax: decToNumber(o.tax),
    total: decToNumber(o.total),
    currency: o.currency,
    status: o.status,
    paymentStatus: o.paymentStatus,
    deliveryMethod: o.deliveryMethod,
    itemCount: o.items.length,
    oversold: hasOversold(o.metadata),
    createdAt: o.createdAt,
    shippingAddress: (o.shippingAddress as ShippingAddress | null) ?? null,
    notes: o.notes,
    metadata: (o.metadata as Record<string, unknown> | null) ?? null,
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productSlug: it.productSlug,
      productName: it.productName,
      productSku: it.productSku,
      variantSize: it.variantSize,
      unitPrice: decToNumber(it.unitPrice),
      quantity: it.quantity,
      subtotal: decToNumber(it.subtotal),
    })),
  };
}
