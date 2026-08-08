import { describe, expect, it } from "vitest";
import { sanitizeReservationItems } from "@/lib/whatsapp-reservation";

describe("sanitizeReservationItems", () => {
  it("conserva únicamente referencias de catálogo y cantidades válidas", () => {
    expect(
      sanitizeReservationItems([
        { productId: "  product-1  ", quantity: 2 },
        { productId: "product-2", quantity: 1 },
        { productId: "", quantity: 1 },
        { productId: "product-3", quantity: 0 },
        { productId: "product-4", quantity: 1.5 },
        { productId: "x".repeat(65), quantity: 1 },
        null,
      ]),
    ).toEqual([
      { productId: "product-1", quantity: 2 },
      { productId: "product-2", quantity: 1 },
    ]);
  });

  it("limita a cincuenta líneas para mantener acotado el endpoint público", () => {
    const payload = Array.from({ length: 75 }, (_, index) => ({
      productId: `product-${index}`,
      quantity: 1,
    }));

    const items = sanitizeReservationItems(payload);

    expect(items).toHaveLength(50);
    expect(items.at(-1)).toEqual({ productId: "product-49", quantity: 1 });
  });

  it("tolera payloads antiguos sin líneas estructuradas", () => {
    expect(sanitizeReservationItems(undefined)).toEqual([]);
    expect(sanitizeReservationItems({ productId: "product-1", quantity: 1 })).toEqual([]);
  });
});
