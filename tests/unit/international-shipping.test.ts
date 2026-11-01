import { describe, expect, it } from "vitest";
import { checkoutDeliveryOptions, checkoutReturnUrls, shippingCents } from "@/lib/stripe/shipping";
describe("international checkout delivery", () => {
  it("sets the fixed foreign tariff in cents without client prices", () => {
    for (const country of ["PT", "FR", "IT", "DE"] as const)
      expect(shippingCents(country, "shipping")).toBe(980);
    expect(shippingCents("ES", "shipping")).toBe(0);
    expect(shippingCents("FR", "pickup")).toBe(0);
    expect(() => shippingCents("US" as "ES", "shipping")).toThrow();
  });
  it("restricts the collected country to the customer's validated selection", () => {
    const result = checkoutDeliveryOptions("FR", "shipping", "fr");
    expect(result.shipping_address_collection?.allowed_countries).toEqual(["FR"]);
    expect(result.shipping_options?.[0]?.shipping_rate_data?.fixed_amount).toEqual({
      currency: "eur",
      amount: 980,
    });
    expect(result.shipping_options?.[0]?.shipping_rate_data).not.toHaveProperty(
      "delivery_estimate",
    );
    expect(
      checkoutDeliveryOptions("DE", "pickup", "de").shipping_address_collection,
    ).toBeUndefined();
    expect(checkoutDeliveryOptions("ES", "shipping", "es").shipping_options).toBeUndefined();
  });
  it("preserves locale in return routes and rejects an external return origin", () => {
    const urls = checkoutReturnUrls("https://zonasportpuebla.com", "pt");
    expect(urls.success_url).toBe(
      "https://zonasportpuebla.com/pt/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(urls.cancel_url).toBe("https://zonasportpuebla.com/pt/checkout/cancelado");
    expect(() =>
      checkoutReturnUrls("https://zonasportpuebla.com", "fr", {
        successUrl: "https://evil.test/pay",
      }),
    ).toThrow();
  });
});
