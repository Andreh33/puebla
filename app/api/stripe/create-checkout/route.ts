/**
 * POST /api/stripe/create-checkout
 *
 * Crea una Stripe Checkout Session a partir del CartIntent del cliente y
 * devuelve la URL hospedada de Stripe a la que redirigir.
 *
 * Body esperado (validado con Zod):
 *   {
 *     items: CheckoutCartItem[],
 *     deliveryMethod?: "pickup" | "shipping",
 *     customerEmail?: string,
 *     successUrl?: string,
 *     cancelUrl?: string,
 *   }
 *
 * Si STRIPE_SECRET_KEY no está definida devuelve 503 con `missing` y un
 * mensaje claro de qué env vars añadir.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStripe, missingStripeEnv, warnIfStripeMissing } from "@/lib/stripe/client";
import type { CreateCheckoutResponse } from "@/lib/stripe/types";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/price";
import { cleanProductName } from "@/lib/utils/html";
import { assertStockAvailable } from "@/lib/stripe/stock-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1).max(250),
  brand: z.string().max(100).default(""),
  imageUrl: z.string().url().nullable(),
  colorName: z.string().max(100).default("Único"),
  size: z.string().max(20).nullable(),
  price: z.number().nonnegative().finite(),
  qty: z.number().int().positive().max(99),
});

const RequestSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1).max(50),
  deliveryMethod: z.enum(["pickup", "shipping"]).optional(),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function siteUrl(req: NextRequest): string {
  const fromReq = req.nextUrl?.origin;
  const base = fromReq || process.env.NEXT_PUBLIC_SITE_URL || "https://zonasport.vercel.app";
  return base.replace(/\/$/, "");
}

export async function POST(req: NextRequest): Promise<NextResponse<CreateCheckoutResponse>> {
  warnIfStripeMissing("create-checkout");
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json<CreateCheckoutResponse>(
      {
        ok: false,
        error: "stripe_not_configured",
        message:
          "El TPV no está activado. Configura STRIPE_SECRET_KEY (y STRIPE_WEBHOOK_SECRET) " +
          "en Vercel para habilitar el checkout.",
        missing: missingStripeEnv(),
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<CreateCheckoutResponse>(
      { ok: false, error: "invalid_json", message: "Body no es JSON válido" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<CreateCheckoutResponse>(
      {
        ok: false,
        error: "invalid_payload",
        message: parsed.error.errors.map((e) => e.message).join("; "),
      },
      { status: 400 },
    );
  }

  const { items, deliveryMethod = "shipping", customerEmail, successUrl, cancelUrl } =
    parsed.data;

  const base = siteUrl(req);

  // SEGURIDAD: nunca confiamos en el `price` del body. Re-consultamos el precio
  // real de cada producto en BD y construimos el unit_amount en servidor. Así
  // un cliente no puede manipular el JSON para pagar 0,01 €. La talla/color sí
  // vienen del cliente (son su seleccin de variante, no afectan al precio).
  const productIds = [...new Set(items.map((it) => it.productId))];
  const dbProducts = await db.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      retailPrice: true,
      salePrice: true,
      mainImageUrl: true,
      stock: true,
      sizes: { select: { size: true, stock: true } },
      brand: { select: { name: true } },
    },
  });
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // VALIDACIÓN DE STOCK antes de cobrar. Espeja el TPV físico: rechaza si la
  // talla pedida (o el stock global, si no hay talla) no cubre la demanda
  // ACUMULADA del carrito. Sin esto, el online cobraba sin comprobar existencias.
  const stockCheck = assertStockAvailable(
    items.map((it) => ({
      productId: it.productId,
      name: it.name,
      size: it.size,
      qty: it.qty,
    })),
    new Map(
      dbProducts.map((p) => [
        p.id,
        { id: p.id, name: p.name, stock: p.stock, sizes: p.sizes },
      ]),
    ),
  );
  if (!stockCheck.ok) {
    return NextResponse.json<CreateCheckoutResponse>(
      { ok: false, error: "out_of_stock", message: stockCheck.message },
      { status: 409 },
    );
  }

  // El tipo concreto `Stripe.Checkout.SessionCreateParams.LineItem` no se
  // re-exporta como sub-namespace en el SDK actual; dejamos que TS infiera
  // la forma del objeto y la valida al pasarlo a `sessions.create`.
  const lineItems: Array<{
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: {
        name: string;
        description: string;
        images?: string[];
        metadata: Record<string, string>;
      };
    };
  }> = [];

  for (const it of items) {
    const p = productMap.get(it.productId);
    if (!p) {
      return NextResponse.json<CreateCheckoutResponse>(
        {
          ok: false,
          error: "product_unavailable",
          message: `El producto "${it.name}" ya no está disponible. Actualiza el carrito.`,
        },
        { status: 409 },
      );
    }
    const { final } = effectivePrice(p.retailPrice, p.salePrice);
    const unitAmount = final.times(100).toDecimalPlaces(0).toNumber();
    if (!Number.isFinite(unitAmount) || unitAmount < 0) {
      return NextResponse.json<CreateCheckoutResponse>(
        {
          ok: false,
          error: "invalid_price",
          message: `Precio no válido para "${p.name}".`,
        },
        { status: 409 },
      );
    }
    const img =
      p.mainImageUrl && /^https?:\/\//i.test(p.mainImageUrl)
        ? [p.mainImageUrl]
        : undefined;
    lineItems.push({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: unitAmount,
        product_data: {
          name: cleanProductName(p.name) || it.name,
          description: [p.brand?.name, it.colorName, it.size]
            .filter(Boolean)
            .join(" · "),
          images: img,
          metadata: {
            zs_product_id: p.id,
            zs_slug: p.slug,
            zs_sku: p.sku ?? "",
            zs_size: it.size ?? "",
            zs_color: it.colorName,
          },
        },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: lineItems,
      customer_email: customerEmail,
      // Recogemos teléfono para coordinar pickup/envío
      phone_number_collection: { enabled: true },
      // Solo pedimos dirección de envío si es shipping. Para pickup la
      // tienda contacta al cliente.
      shipping_address_collection:
        deliveryMethod === "shipping"
          ? { allowed_countries: ["ES", "PT"] }
          : undefined,
      // España + Portugal son los únicos países de envío inicialmente.
      locale: "es",
      success_url:
        successUrl ?? `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${base}/checkout/cancelado`,
      metadata: {
        deliveryMethod,
        source: "zonasport-web",
      },
    });

    if (!session.url) {
      return NextResponse.json<CreateCheckoutResponse>(
        {
          ok: false,
          error: "no_session_url",
          message: "Stripe no devolvió URL de sesión",
        },
        { status: 502 },
      );
    }

    return NextResponse.json<CreateCheckoutResponse>({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[stripe:create-checkout] error:", message);
    return NextResponse.json<CreateCheckoutResponse>(
      { ok: false, error: "stripe_error", message },
      { status: 502 },
    );
  }
}
