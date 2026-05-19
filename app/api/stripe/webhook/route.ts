/**
 * POST /api/stripe/webhook
 *
 * Recibe eventos de Stripe (Checkout, Charges, PaymentIntents) y los
 * proyecta sobre nuestra tabla `Order`.
 *
 * Eventos manejados:
 *   - checkout.session.completed     → crea Order con status=PAID
 *   - charge.refunded                → marca Order como REFUNDED
 *   - payment_intent.payment_failed  → marca Order como CANCELLED
 *
 * Si STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET están ausentes devuelve 503
 * (no 500) para que Stripe reintente cuando se configuren.
 *
 * Configuración del endpoint en el dashboard Stripe:
 *   URL:     https://zonasport.es/api/stripe/webhook
 *   Eventos: checkout.session.completed, charge.refunded,
 *            payment_intent.payment_failed
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const order = await createOrderFromCheckout(session);
        return NextResponse.json({
          received: true,
          handled: event.type,
          orderId: order?.id ?? null,
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
