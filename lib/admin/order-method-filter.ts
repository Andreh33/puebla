/**
 * Filtro de pedidos por método de pago para /admin/pedidos.
 *
 * Módulo compartido cliente/servidor: las OPCIONES las pinta el Select del
 * cliente y `methodWhere` lo usan la página y el export CSV para construir el
 * WHERE de Prisma (el import de Prisma es type-only → no llega al bundle).
 *
 * Los métodos concretos filtran por `Order.metadata.paymentMethod` (capturado
 * por el webhook desde 2026-07-06). "TPV" filtra por deliveryMethod y
 * "Online (todos)" es cualquier pedido no-TPV — incluye los antiguos sin
 * método capturado. No hay cubo "sin método" exacto a propósito: exigiría
 * negaciones sobre JSON con trampa de NULLs en Postgres (fila con clave
 * ausente → comparación NULL → NOT(NULL) la excluye en silencio).
 */

import type { Prisma } from "@prisma/client";

/** Métodos con captura conocida (valores de Stripe payment_method_details.type). */
const KNOWN_METHODS = ["card", "bizum", "klarna", "paypal"] as const;

export const PAYMENT_METHOD_FILTER_OPTIONS = [
  { value: "ALL", label: "Método: todos" },
  { value: "card", label: "Tarjeta" },
  { value: "bizum", label: "Bizum" },
  { value: "klarna", label: "Klarna" },
  { value: "paypal", label: "PayPal" },
  { value: "tpv", label: "TPV (tienda)" },
  { value: "online", label: "Online (todos)" },
] as const;

export type PaymentMethodFilter = (typeof PAYMENT_METHOD_FILTER_OPTIONS)[number]["value"];

/** true si `v` es un valor válido del filtro (para sanear searchParams). */
export function isPaymentMethodFilter(v: string | undefined): v is PaymentMethodFilter {
  return !!v && PAYMENT_METHOD_FILTER_OPTIONS.some((o) => o.value === v);
}

/**
 * WHERE de Prisma para un valor del filtro. "ALL" (o valor desconocido) → null
 * (sin filtro). Combinar SIEMPRE vía `where.AND = [...(where.AND ?? []), mw]`
 * para no pisar un `OR` previo (p. ej. el de la búsqueda por texto).
 */
export function methodWhere(method: string): Prisma.OrderWhereInput | null {
  if ((KNOWN_METHODS as readonly string[]).includes(method)) {
    return { metadata: { path: ["paymentMethod"], equals: method } };
  }
  if (method === "tpv") return { deliveryMethod: "in_store" };
  if (method === "online") {
    // NULL-safe: deliveryMethod nulo también cuenta como online.
    return { OR: [{ deliveryMethod: null }, { deliveryMethod: { not: "in_store" } }] };
  }
  return null;
}
