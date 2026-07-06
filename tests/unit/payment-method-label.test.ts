import { describe, it, expect } from "vitest";
import { paymentMethodLabel } from "@/lib/stripe/payment-method";

describe("paymentMethodLabel", () => {
  it("mapea los métodos concretos de Stripe", () => {
    expect(paymentMethodLabel("bizum", "shipping")).toBe("Bizum");
    expect(paymentMethodLabel("paypal", "shipping")).toBe("PayPal");
    expect(paymentMethodLabel("card", "shipping")).toBe("Tarjeta");
  });

  it("sin método: TPV para in_store, Online para el resto", () => {
    expect(paymentMethodLabel(null, "in_store")).toBe("TPV");
    expect(paymentMethodLabel(undefined, "shipping")).toBe("Online");
    expect(paymentMethodLabel(null, null)).toBe("Online");
  });

  it("método desconocido cae a Online", () => {
    expect(paymentMethodLabel("klarna", "shipping")).toBe("Online");
  });
});
