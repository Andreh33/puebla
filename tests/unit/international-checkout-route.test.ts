import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { createSession, findMany } = vi.hoisted(() => ({
  createSession: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({ checkout: { sessions: { create: createSession } } }),
  missingStripeEnv: () => [],
  warnIfStripeMissing: () => {},
}));
vi.mock("@/lib/db", () => ({ db: { product: { findMany } } }));
vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: () => true }));
vi.mock("@/lib/i18n/content", () => ({
  localizeContent: (_kind: string, locale: string, source: Record<string, unknown>) => ({
    ...source,
    name: locale === "fr" ? "Chaussure" : source.name,
    colorName: locale === "fr" ? "Bleu" : source.colorName,
  }),
}));
vi.mock("@/lib/promo/validate", () => ({ validatePromoCode: vi.fn() }));
import { POST } from "@/app/api/stripe/create-checkout/route";
const item = {
  productId: "p1",
  slug: "shoe",
  name: "Client text",
  brand: "Marca",
  imageUrl: null,
  colorName: "Azul",
  size: null,
  price: 0.01,
  qty: 1,
};
beforeEach(() => {
  vi.clearAllMocks();
  createSession.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.test/session" });
  findMany.mockResolvedValue([
    {
      id: "p1",
      slug: "shoe",
      name: "Zapatilla",
      sku: "S1",
      modelCode: "M1",
      externalId: null,
      retailPrice: 49.5,
      salePrice: null,
      mainImageUrl: null,
      stock: 3,
      sizes: [],
      brand: { name: "Marca" },
      colorName: "Azul",
      tags: [],
      images: [],
    },
  ]);
});
function request(body: Record<string, unknown>) {
  return new NextRequest("https://zonasportpuebla.com/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify({ items: [item], shippingCountry: "FR", locale: "fr", ...body }),
    headers: { "content-type": "application/json" },
  });
}
describe("validated international checkout endpoint", () => {
  it("uses server prices and980cents shipping, Spanish labels and native locale/returns", async () => {
    expect((await POST(request({ shippingCost: 0 }))).status).toBe(200);
    const session = createSession.mock.calls[0]?.[0];
    expect(session.line_items[0].price_data.unit_amount).toBe(4950);
    expect(session.line_items[0].price_data.product_data.name).toBe("Zapatilla");
    expect(session.line_items[0].price_data.product_data.description).toBe("Marca · Azul");
    expect(session.shipping_options[0].shipping_rate_data.fixed_amount).toEqual({
      currency: "eur",
      amount: 980,
    });
    expect(session.shipping_address_collection.allowed_countries).toEqual(["FR"]);
    expect(session.locale).toBe("fr");
    expect(session.success_url).toContain("/fr/checkout/success?");
    expect(session).not.toHaveProperty("payment_method_types");
  });
  it("rejects an unsupported country and external return origin before creating a session", async () => {
    expect((await POST(request({ shippingCountry: "US" }))).status).toBe(400);
    expect((await POST(request({ successUrl: "https://evil.test/return" }))).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });
});
