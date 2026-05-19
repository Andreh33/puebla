import { describe, it, expect } from "vitest";
import { whatsappUrl, telHref, WhatsAppMessages, WHATSAPP_NUMBER } from "@/lib/whatsapp";

describe("whatsappUrl", () => {
  it("usa el número por defecto si no se pasa argumento", () => {
    const url = whatsappUrl("Hola");
    expect(url).toContain(`https://wa.me/${WHATSAPP_NUMBER}`);
    expect(url).toContain("?text=Hola");
  });

  it("limpia caracteres no numéricos del teléfono", () => {
    const url = whatsappUrl("Hola", "+34 (689) 110-691");
    expect(url).toBe(`https://wa.me/34689110691?text=Hola`);
  });

  it("codifica el mensaje correctamente", () => {
    const url = whatsappUrl("Hola, ¿cómo estás?");
    expect(url).toContain("text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F");
  });
});

describe("WhatsAppMessages", () => {
  it("product con talla genera mensaje específico", () => {
    const m = WhatsAppMessages.product("Mochila Adidas", "M");
    expect(m).toContain("Mochila Adidas");
    expect(m).toContain("talla M");
  });

  it("product sin talla omite la sección", () => {
    const m = WhatsAppMessages.product("Mochila Adidas");
    expect(m).toContain("Mochila Adidas");
    expect(m).not.toContain("talla");
  });

  it("reservation menciona la tienda", () => {
    const m = WhatsAppMessages.reservation("Zapatillas", "42");
    expect(m).toContain("reservar");
    expect(m).toContain("Zapatillas");
    expect(m).toContain("42");
  });

  it("local incluye el municipio", () => {
    const m = WhatsAppMessages.local("Mérida");
    expect(m).toContain("Mérida");
  });

  it("generic devuelve string no vacío", () => {
    expect(WhatsAppMessages.generic().length).toBeGreaterThan(5);
  });
});

describe("telHref", () => {
  it("genera tel: con prefijo + y solo dígitos", () => {
    expect(telHref("+34 689 110 691")).toBe("tel:+34689110691");
  });
});
