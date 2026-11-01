import { localizeContent } from "@/lib/i18n/content";
import { PRODUCT_TRANSLATIONS_ENABLED } from "@/lib/i18n/publication-policy";
import { isLocalePublished } from "@/lib/i18n/readiness";
import {
  SHIPPING_COUNTRIES,
  checkoutDeliveryOptions,
  checkoutReturnUrls,
  shippingCents,
} from "@/lib/stripe/shipping";
import { LOCALES } from "@/lib/i18n/config";
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
import { validatePromoCode } from "@/lib/promo/validate";
import { resolveProductSku } from "@/lib/products/sku";

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
  shippingCountry: z.enum(SHIPPING_COUNTRIES).default("ES"),
  locale: z.enum(LOCALES).default("es"),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  promoCode: z.string().max(40).optional(),
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

  const {
    items,
    deliveryMethod = "shipping",
    shippingCountry,
    locale,
    customerEmail,
    successUrl,
    cancelUrl,
    promoCode,
  } = parsed.data;

  if (!isLocalePublished(locale))
    return NextResponse.json<CreateCheckoutResponse>(
      { ok: false, error: "locale_unavailable", message: "Este idioma todavía no está publicado." },
      { status: 409 },
    );
  const base = siteUrl(req);
  let returnUrls: ReturnType<typeof checkoutReturnUrls>;
  try {
    returnUrls = checkoutReturnUrls(base, locale, { successUrl, cancelUrl });
  } catch {
    return NextResponse.json<CreateCheckoutResponse>(
      {
        ok: false,
        error: "invalid_return_url",
        message: "La URL de retorno debe pertenecer a la tienda.",
      },
      { status: 400 },
    );
  }

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
      shortName: true,
      description: true,
      technicalDescription: true,
      colorName: true,
      sportUse: true,
      composition: true,
      metaTitle: true,
      metaDescription: true,
      tags: true,
      images: { select: { url: true, alt: true } },
      slug: true,
      sku: true,
      modelCode: true,
      externalId: true,
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
      dbProducts.map((p) => [p.id, { id: p.id, name: p.name, stock: p.stock, sizes: p.sizes }]),
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
    const localized = localizeContent("products", PRODUCT_TRANSLATIONS_ENABLED ? locale : "es", p);
    if (!localized)
      return NextResponse.json<CreateCheckoutResponse>(
        {
          ok: false,
          error: "translation_unavailable",
          message: "La información del producto ha cambiado. Actualiza el carrito.",
        },
        { status: 409 },
      );
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
      p.mainImageUrl && /^https?:\/\//i.test(p.mainImageUrl) ? [p.mainImageUrl] : undefined;
    lineItems.push({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: unitAmount,
        product_data: {
          name: cleanProductName(localized.name) || it.name,
          description: [p.brand?.name, localized.colorName, it.size].filter(Boolean).join(" · "),
          images: img,
          metadata: {
            zs_product_id: p.id,
            zs_slug: p.slug,
            zs_sku: resolveProductSku({
              modelCode: p.modelCode,
              externalId: p.externalId,
              id: p.id,
            }),
            zs_size: it.size ?? "",
            zs_color: p.colorName,
          },
        },
      },
    });
  }

  // Código de promoción: el descuento se aplica REBAJANDO los unit_amounts (no
  // con cupones de Stripe). Así `amount_subtotal == amount_total`, y el pedido, la
  // factura de Holded y los reembolsos ven un pedido normal más barato — nada
  // downstream cambia. La validación aquí (contra los precios reales de BD) es la
  // autoritativa; la del carrito es solo para mostrar.
  let appliedPromo: string | null = null;
  if (promoCode && promoCode.trim()) {
    const grossCents = lineItems.reduce((a, li) => a + li.price_data.unit_amount * li.quantity, 0);
    if (grossCents <= 0) {
      return NextResponse.json<CreateCheckoutResponse>(
        { ok: false, error: "promo_invalid", message: "El carrito no permite aplicar el código." },
        { status: 409 },
      );
    }
    const promo = await validatePromoCode(promoCode, grossCents / 100);
    if (!promo.ok) {
      return NextResponse.json<CreateCheckoutResponse>(
        { ok: false, error: "promo_invalid", message: promo.error },
        { status: 409 },
      );
    }
    const discountCents = Math.min(Math.round(promo.discount * 100), grossCents);
    const targetCents = grossCents - discountCents;
    // Rebaja proporcional por unidad (el total real es la suma de las líneas
    // rebajadas; puede diferir unos céntimos del ideal por el redondeo por unidad).
    const factor = targetCents / grossCents;
    for (const li of lineItems) {
      li.price_data.unit_amount = Math.max(0, Math.round(li.price_data.unit_amount * factor));
    }
    // Comprobamos el total REAL (no el ideal) contra el mínimo de Stripe (0,50 €),
    // para que sessions.create no falle con un error genérico.
    const realCents = lineItems.reduce((a, li) => a + li.price_data.unit_amount * li.quantity, 0);
    if (realCents < 50) {
      return NextResponse.json<CreateCheckoutResponse>(
        {
          ok: false,
          error: "promo_too_big",
          message: "El descuento deja el total por debajo del mínimo para pagar online.",
        },
        { status: 409 },
      );
    }
    appliedPromo = promo.code;
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
      ...checkoutDeliveryOptions(shippingCountry, deliveryMethod, locale),
      locale,
      ...returnUrls,
      metadata: {
        deliveryMethod,
        shippingCountry,
        locale,
        shippingCents: String(shippingCents(shippingCountry, deliveryMethod)),
        source: "zonasport-web",
        ...(appliedPromo ? { promoCode: appliedPromo } : {}),
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
