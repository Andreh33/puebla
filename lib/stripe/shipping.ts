import type Stripe from "stripe";
import { localePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
export const SHIPPING_COUNTRIES = ["ES", "PT", "FR", "IT", "DE"] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];
export function shippingCents(country: ShippingCountry, method: "shipping" | "pickup"): number {
  if (!(SHIPPING_COUNTRIES as readonly string[]).includes(country))
    throw new Error("Unsupported shipping country");
  return method === "pickup" || country === "ES" ? 0 : 980;
}
const SHIPPING_LABEL = {
  es: "Envío internacional",
  pt: "Envio internacional",
  fr: "Livraison internationale",
  it: "Spedizione internazionale",
  de: "Internationaler Versand",
} as const;
export function checkoutDeliveryOptions(
  country: ShippingCountry,
  method: "shipping" | "pickup",
  locale: Locale,
): Pick<Stripe.Checkout.SessionCreateParams, "shipping_address_collection" | "shipping_options"> {
  const amount = shippingCents(country, method);
  if (method === "pickup") return {};
  return {
    shipping_address_collection: { allowed_countries: [country] },
    ...(amount > 0
      ? {
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount" as const,
                fixed_amount: { currency: "eur", amount },
                display_name: SHIPPING_LABEL[locale],
              },
            },
          ],
        }
      : {}),
  };
}
export function checkoutReturnUrls(
  base: string,
  locale: Locale,
  overrides: { successUrl?: string; cancelUrl?: string } = {},
): { success_url: string; cancel_url: string } {
  const origin = new URL(base).origin;
  function valid(override: string | undefined, fallback: string): string {
    if (!override) return `${origin}${fallback}`;
    const parsed = new URL(override);
    if (parsed.origin !== origin || parsed.username || parsed.password)
      throw new Error("Return URL must use the shop origin");
    return parsed.toString();
  }
  return {
    success_url: valid(
      overrides.successUrl,
      `${localePath(locale, "/checkout/success")}?session_id={CHECKOUT_SESSION_ID}`,
    ),
    cancel_url: valid(overrides.cancelUrl, localePath(locale, "/checkout/cancelado")),
  };
}
