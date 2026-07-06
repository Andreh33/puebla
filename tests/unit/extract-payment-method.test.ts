import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/db", () => ({ db: {}, Prisma: { PrismaClientKnownRequestError: class {} } }));
vi.mock("@/lib/products/stock", () => ({ recomputeProductStock: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => null }));

function session(pi: unknown): Stripe.Checkout.Session {
  return { payment_intent: pi } as unknown as Stripe.Checkout.Session;
}

describe("extractPaymentMethod", () => {
  it("devuelve el type del cargo cuando está expandido", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    const s = session({ latest_charge: { payment_method_details: { type: "paypal" } } });
    expect(extractPaymentMethod(s)).toBe("paypal");
  });

  it("bizum", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    const s = session({ latest_charge: { payment_method_details: { type: "bizum" } } });
    expect(extractPaymentMethod(s)).toBe("bizum");
  });

  it("payment_intent como string → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session("pi_123"))).toBeNull();
  });

  it("latest_charge como string (no expandido) → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session({ latest_charge: "ch_123" }))).toBeNull();
  });

  it("sin payment_intent → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session(null))).toBeNull();
  });
});
