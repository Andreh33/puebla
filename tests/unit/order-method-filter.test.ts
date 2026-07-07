import { describe, it, expect } from "vitest";
import {
  isPaymentMethodFilter,
  methodWhere,
  PAYMENT_METHOD_FILTER_OPTIONS,
} from "@/lib/admin/order-method-filter";

describe("methodWhere", () => {
  it("métodos concretos filtran por metadata.paymentMethod", () => {
    for (const m of ["card", "bizum", "klarna", "paypal"]) {
      expect(methodWhere(m)).toEqual({
        metadata: { path: ["paymentMethod"], equals: m },
      });
    }
  });

  it("tpv filtra por deliveryMethod in_store", () => {
    expect(methodWhere("tpv")).toEqual({ deliveryMethod: "in_store" });
  });

  it("online es NULL-safe (incluye deliveryMethod nulo)", () => {
    expect(methodWhere("online")).toEqual({
      OR: [{ deliveryMethod: null }, { deliveryMethod: { not: "in_store" } }],
    });
  });

  it("ALL o valores desconocidos → null (sin filtro)", () => {
    expect(methodWhere("ALL")).toBeNull();
    expect(methodWhere("")).toBeNull();
    expect(methodWhere("hackeo")).toBeNull();
  });
});

describe("isPaymentMethodFilter", () => {
  it("acepta todos los valores de las opciones y rechaza el resto", () => {
    for (const o of PAYMENT_METHOD_FILTER_OPTIONS) {
      expect(isPaymentMethodFilter(o.value)).toBe(true);
    }
    expect(isPaymentMethodFilter(undefined)).toBe(false);
    expect(isPaymentMethodFilter("hackeo")).toBe(false);
  });
});
