/**
 * POST /api/stripe/webhook
 *
 * Recibe eventos de Stripe (Checkout, Charges, PaymentIntents) y los
 * proyecta sobre nuestra tabla `Order`.
 *
 * Eventos manejados:
 *   - checkout.session.completed              → crea Order PAID SOLO si está pagada
 *   - checkout.session.async_payment_succeeded → idem para métodos asíncronos
 *   - charge.refunded                         → marca Order como REFUNDED
 *   - payment_intent.payment_failed           → marca Order como CANCELLED
 *
 * Si STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET están ausentes devuelve 503
 * (no 500) para que Stripe reintente cuando se configuren.
 *
 * Configuración del endpoint en el dashboard Stripe:
 *   URL:     https://zonasport.vercel.app/api/stripe/webhook  (NO zonasport.es:
 *            ese dominio está aparcado/spam y el webhook no crearía pedidos)
 *   Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
 *            charge.refunded, payment_intent.payment_failed
 *   Versión API: la que uses (cualquier `2024-*` o posterior vale).
 */

import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { STRIPE_ENV_VARS } from "@/lib/stripe/types";
import { getStripe, warnIfStripeMissing } from "@/lib/stripe/client";
import {
  createOrderFromCheckout,
  markOrderCancelled,
  markOrderRefunded,
} from "@/lib/stripe/orders";
import { issueInvoiceForOrder } from "@/lib/holded/invoice";
import { isHoldedConfigured } from "@/lib/holded/client";

// Stripe requiere el cuerpo crudo para verificar la firma → runtime Node.
export const runtime = "nodejs";
// Los webhooks no se cachean nunca.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  warnIfStripeMissing("webhook");
  const stripe = getStripe();
  const webhookSecret = process.env[STRIPE_ENV_VARS.webhook];

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Stripe no configurado",
        message:
          "El webhook está montado pero faltan las variables STRIPE_SECRET_KEY " +
          "y/o STRIPE_WEBHOOK_SECRET. Añádelas en Vercel y vuelve a desplegar.",
      },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "missing_signature" },
      { status: 400 },
    );
  }

  // Body crudo necesario para verificar la firma HMAC.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_signature";
    console.warn("[stripe:webhook] firma inválida:", message);
    return NextResponse.json(
      { error: "invalid_signature", message },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      // `completed` llega al terminar el checkout; `async_payment_succeeded`
      // llega cuando un método de pago asíncrono confirma DESPUÉS. En ambos
      // delegamos en createOrderFromCheckout, que solo crea el pedido si
      // payment_status ya es "paid" — nunca antes de cobrar.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await createOrderFromCheckout(session);
        // Facturación fiscal (Modelo B): los pedidos ONLINE se facturan en Holded
        // → VeriFactu. Best-effort: un fallo de Holded NUNCA rompe el webhook ni
        // el pedido (ya creado y cobrado).
        const invoiced = order ? await maybeInvoiceOnlineOrder(order.id) : null;
        return NextResponse.json({
          received: true,
          handled: event.type,
          orderId: order?.id ?? null,
          invoiced,
        });
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const order = await markOrderRefunded(charge);
        return NextResponse.json({
          received: true,
          handled: event.type,
          orderId: order?.id ?? null,
        });
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const order = await markOrderCancelled(intent);
        return NextResponse.json({
          received: true,
          handled: event.type,
          orderId: order?.id ?? null,
        });
      }

      default:
        // Reconocemos el evento pero no lo procesamos. Stripe espera 2xx
        // para todos los eventos no relevantes; de lo contrario reintenta.
        return NextResponse.json({ received: true, handled: null });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    console.error(`[stripe:webhook] error procesando ${event.type}:`, message);
    // Devolvemos 500 para que Stripe reintente con backoff exponencial.
    return NextResponse.json(
      { error: "processing_failed", event: event.type, message },
      { status: 500 },
    );
  }
}

/**
 * Emite la factura del pedido online en Holded si la auto-facturación está
 * activada (`HOLDED_AUTO_INVOICE === "on"`) y la key está configurada.
 *
 * Best-effort: captura cualquier error y lo loggea; NUNCA lanza — un fallo de
 * Holded no debe afectar al webhook ni al pedido (que ya está creado y cobrado).
 * Devuelve el docId emitido, "skipped" si está desactivada/no configurada, o
 * null si la emisión falló (queda en logs para reintentar a mano).
 */
async function maybeInvoiceOnlineOrder(orderId: string): Promise<string | null> {
  if (process.env.HOLDED_AUTO_INVOICE !== "on" || !isHoldedConfigured()) {
    return "skipped";
  }
  try {
    const res = await issueInvoiceForOrder(orderId);
    if (res.ok) return res.docId ?? "ok";
    console.error(`[holded] no se pudo facturar el pedido ${orderId}: ${res.error}`);
    return null;
  } catch (e) {
    console.error(
      `[holded] error facturando el pedido ${orderId}:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * GET liviano para health-check del endpoint. Stripe usa POST.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "stripe-webhook",
    configured: Boolean(
      process.env[STRIPE_ENV_VARS.secret] && process.env[STRIPE_ENV_VARS.webhook],
    ),
  });
}
