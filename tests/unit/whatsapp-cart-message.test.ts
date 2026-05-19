import { describe, it, expect } from "vitest";
import { buildCartWhatsAppMessage } from "@/lib/cart/whatsapp-message";
import type { CartItem } from "@/lib/cart/store";

function item(over: Partial<CartItem>): CartItem {
  return {
    productId: "x",
    slug: "x",
    name: "X",
    brand: "X",
    imageUrl: null,
    colorName: "Único",
    size: null,
    price: 0,
    qty: 1,
    addedAt: 0,
    ...over,
  };
}

describe("buildCartWhatsAppMessage", () => {
  it("genera mensaje completo con 3 items distintos, encabezado y total", () => {
    const items: CartItem[] = [
      item({
        productId: "1",
        brand: "John Smith",
        name: "Mochila M24205",
        colorName: "Azul Marino",
        size: "M",
        qty: 1,
        price: 21.99,
      }),
      item({
        productId: "2",
        brand: "+8000",
        name: "Zapatilla Tarpon",
        colorName: "Negra",
        size: "42",
        qty: 1,
        price: 54.99,
      }),
      item({
        productId: "3",
        brand: "Adidas",
        name: "Camiseta Run It",
        colorName: "Blanca",
        size: "L",
        qty: 2,
        price: 19.95,
      }),
    ];

    const msg = buildCartWhatsAppMessage(items);

    // Encabezado
    expect(msg.startsWith("Hola, quiero reservar esta selección:")).toBe(true);

    // Línea 1: numerada, brand+name+color+talla+qty+precio
    expect(msg).toContain("1. John Smith Mochila M24205 Azul Marino");
    expect(msg).toContain("· Talla M");
    expect(msg).toContain("· 1 ud");
    expect(msg).toMatch(/21,99\s?€/);

    // Línea 2
    expect(msg).toContain("2. +8000 Zapatilla Tarpon Negra");
    expect(msg).toContain("· Talla 42");

    // Línea 3 con qty 2
    expect(msg).toContain("3. Adidas Camiseta Run It Blanca");
    expect(msg).toContain("· 2 ud");

    // Total = 21.99 + 54.99 + 19.95*2 = 116.88
    expect(msg).toMatch(/Total:\s+116,88\s?€/);

    // Despedida
    expect(msg.trim().endsWith("Gracias.")).toBe(true);
  });

  it("omite 'Talla' si la talla es ÚNICA / null", () => {
    const msg = buildCartWhatsAppMessage([
      item({
        productId: "1",
        brand: "Marca",
        name: "Producto",
        colorName: "Único",
        size: "ÚNICA",
        qty: 1,
        price: 10,
      }),
    ]);
    expect(msg).not.toContain("Talla ÚNICA");
    expect(msg).toContain("· 1 ud");
  });

  it("omite el color cuando es 'Único'", () => {
    const msg = buildCartWhatsAppMessage([
      item({
        productId: "1",
        brand: "Marca",
        name: "Producto",
        colorName: "Único",
        size: "S",
        qty: 1,
        price: 10,
      }),
    ]);
    expect(msg).toContain("1. Marca Producto · Talla S");
    expect(msg).not.toContain("Único");
  });

  it("devuelve mensaje fallback si el carrito está vacío", () => {
    const msg = buildCartWhatsAppMessage([]);
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).not.toContain("Total:");
  });

  it("suma correctamente cuando hay qty > 1 en varias líneas", () => {
    const msg = buildCartWhatsAppMessage([
      item({ productId: "a", price: 10, qty: 3 }),
      item({ productId: "b", price: 5.55, qty: 2 }),
    ]);
    // 10*3 + 5.55*2 = 41.10
    expect(msg).toMatch(/Total:\s+41,10\s?€/);
  });
});
