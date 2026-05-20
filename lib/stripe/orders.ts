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

  return db.order.create({
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
      metadata: (expandedSession.metadata ?? {}) as Prisma.InputJsonValue,
      items: { create: items },
    },
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
    createdAt: o.createdAt,
  };
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
