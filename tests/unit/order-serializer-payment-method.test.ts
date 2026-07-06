import { describe, it, expect, vi } from "vitest";

// El módulo importa db/stock/client; los stubbeamos para que cargue limpio.
// toOrderSummary/toOrderDetail son puras (solo leen campos), no usan estos mocks.
vi.mock("@/lib/db", () => ({ db: {}, Prisma: { PrismaClientKnownRequestError: class {} } }));
vi.mock("@/lib/products/stock", () => ({ recomputeProductStock: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => null }));

function fakeOrder(metadata: Record<string, unknown> | null) {
  return {
    id: "o1",
    stripeSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    stripeCustomerId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    subtotal: 10,
    shippingCost: 0,
    tax: 2,
    total: 12,
    currency: "EUR",
    status: "PAID",
    paymentStatus: "paid",
    deliveryMethod: "shipping",
    shippingAddress: null,
    notes: null,
    holdedInvoiceNumber: null,
    invoicedAt: null,
    createdAt: new Date("2026-07-06T10:00:00.000Z"),
    metadata,
    _count: { items: 1 },
    items: [],
  };
}

describe("serializers exponen paymentMethod desde metadata", () => {
  it("toOrderSummary lee metadata.paymentMethod", async () => {
    const { toOrderSummary } = await import("@/lib/stripe/orders");
    const o = fakeOrder({ paymentMethod: "bizum" });
    expect(toOrderSummary(o as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBe("bizum");
  });

  it("toOrderDetail lee metadata.paymentMethod", async () => {
    const { toOrderDetail } = await import("@/lib/stripe/orders");
    const o = fakeOrder({ paymentMethod: "paypal" });
    expect(toOrderDetail(o as unknown as Parameters<typeof toOrderDetail>[0]).paymentMethod).toBe("paypal");
  });

  it("sin la clave → null", async () => {
    const { toOrderSummary } = await import("@/lib/stripe/orders");
    expect(toOrderSummary(fakeOrder({ source: "x" }) as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBeNull();
    expect(toOrderSummary(fakeOrder(null) as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBeNull();
  });
});
