/**
 * Tipos compartidos del módulo Stripe.
 *
 * Se mantienen agnósticos del SDK de Stripe para que la UI pueda importarlos
 * sin arrastrar el bundle de `stripe` (que es Node-only y pesado).
 */

import type { OrderStatus } from "@prisma/client";
import type { PosOpenItemKind } from "@/lib/pos/open-items";

/**
 * Item del carrito (CartItem en lib/cart/store.ts) tal y como llega al endpoint
 * de creación de checkout. Se valida con Zod en el handler.
 */
export interface CheckoutCartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  colorName: string;
  size: string | null;
  /** Precio unitario en EUR con 2 decimales, IVA incluido. */
  price: number;
  qty: number;
}

/** Payload aceptado por POST /api/stripe/create-checkout. */
export interface CreateCheckoutRequest {
  items: CheckoutCartItem[];
  /** "shipping" envía a domicilio; "pickup" recoger en tienda. */
  deliveryMethod?: "pickup" | "shipping";
  /** Email pre-rellenado en Stripe Checkout. */
  customerEmail?: string;
  /** URL absoluta de éxito (override del default). */
  successUrl?: string;
  /** URL absoluta de cancelación (override del default). */
  cancelUrl?: string;
}

/** Respuesta cuando Stripe está configurado. */
export interface CreateCheckoutSuccess {
  ok: true;
  url: string;
  sessionId: string;
}

/** Respuesta cuando Stripe no está configurado (503). */
export interface StripeUnconfiguredError {
  ok: false;
  error: "stripe_not_configured";
  message: string;
  missing: string[];
}

/** Resultado genérico de error del módulo Stripe. */
export interface StripeError {
  ok: false;
  error: string;
  message: string;
}

export type CreateCheckoutResponse =
  | CreateCheckoutSuccess
  | StripeUnconfiguredError
  | StripeError;

/**
 * Snapshot serializable de un Order para la UI de /admin/pedidos.
 * Convierte los Decimal de Prisma en number (todos en EUR con 2 decimales).
 */
export interface OrderSummary {
  id: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: string | null;
  deliveryMethod: string | null;
  /** Método de pago usado (de Stripe): "card" | "paypal" | "bizum". null si TPV o no capturado. */
  paymentMethod: string | null;
  itemCount: number;
  /** true si metadata.oversold tiene líneas (venta sin stock por carrera). */
  oversold: boolean;
  /** Artículo libre exclusivo del TPV; null para pedidos normales. */
  posOpenItemKind: PosOpenItemKind | null;
  createdAt: Date;
}

export interface OrderDetail extends OrderSummary {
  shippingAddress: ShippingAddress | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  /** Facturación fiscal (Holded). null si aún no se ha emitido la factura. */
  holdedInvoiceNumber: string | null;
  invoicedAt: Date | null;
  items: OrderItemDetail[];
  /** Devoluciones por línea (TPV). Vacío si no ha habido ninguna. */
  returns: OrderItemReturn[];
}

/** Una devolución de línea registrada en `Order.metadata.returns` (solo TPV). */
export interface OrderItemReturn {
  itemId: string;
  productName: string;
  variantSize: string | null;
  qty: number;
  /** Bruto (IVA incl.) devuelto al cliente por esta operación. */
  amount: number;
  /** ISO timestamp de la devolución. */
  at: string;
}

export interface OrderItemDetail {
  id: string;
  productId: string | null;
  productSlug: string | null;
  productName: string;
  productSku: string | null;
  description: string | null;
  posOpenItemKind: PosOpenItemKind | null;
  variantSize: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country?: string | null;
  name?: string | null;
  phone?: string | null;
}

/** Lista cerrada de env vars que el módulo lee. */
export const STRIPE_ENV_VARS = {
  secret: "STRIPE_SECRET_KEY",
  webhook: "STRIPE_WEBHOOK_SECRET",
  publishable: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
} as const;

export type StripeEnvVar = (typeof STRIPE_ENV_VARS)[keyof typeof STRIPE_ENV_VARS];
