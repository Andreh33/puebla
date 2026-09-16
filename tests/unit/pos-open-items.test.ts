import { describe, expect, it } from "vitest";
import { calculateInvoiceMargin } from "@/lib/pos/open-items";

describe("margen manual del SKU 1111", () => {
  it("convierte un porcentaje de ganancia en coste", () => {
    expect(calculateInvoiceMargin(900, "percentage", 20)).toEqual({
      profitAmount: 180,
      unitCost: 720,
    });
  });

  it("acepta una ganancia exacta y redondea a céntimos", () => {
    expect(calculateInvoiceMargin(900, "amount", 123.456)).toEqual({
      profitAmount: 123.46,
      unitCost: 776.54,
    });
  });

  it("rechaza porcentajes mayores de 100 y ganancias superiores a la factura", () => {
    expect(calculateInvoiceMargin(900, "percentage", 100.01)).toBeNull();
    expect(calculateInvoiceMargin(900, "amount", 900.01)).toBeNull();
  });
});
