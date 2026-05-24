import { describe, it, expect } from "vitest";
import { buildReceiptText } from "@/lib/pos/receipt-text";

describe("buildReceiptText", () => {
  const base = {
    ticketNumber: "ZS-20260524-0001",
    createdAt: new Date("2026-05-24T18:30:00"),
    items: [
      { productName: "Zapatilla LLO878 Azul", variantSize: "40", productSku: "LLO878/40", quantity: 1, subtotal: 49.99 },
    ],
    subtotal: 41.31, tax: 8.68, total: 49.99,
    paymentMethod: "efectivo" as const,
    ticketUrl: "https://blob.example/ticket.pdf",
  };

  it("incluye tienda, nº ticket, línea con talla y total", () => {
    const txt = buildReceiptText(base);
    expect(txt).toContain("Zona Sport");
    expect(txt).toContain("ZS-20260524-0001");
    expect(txt).toContain("Zapatilla LLO878 Azul");
    expect(txt).toContain("talla 40");
    expect(txt).toContain("49,99");
    expect(txt).toContain("https://blob.example/ticket.pdf");
  });

  it("omite el enlace si no hay ticketUrl", () => {
    const txt = buildReceiptText({ ...base, ticketUrl: null });
    expect(txt).not.toContain("Ver ticket");
  });
});
