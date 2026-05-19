/**
 * Generador de mensaje de WhatsApp para "reservar todo el carrito".
 * Texto plano, una línea por item, total al final.
 */

import { totalPricePure, type CartItem } from "./store";

function formatPriceEs(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function describeItem(item: CartItem): string {
  // Construye un encabezado limpio: "Brand Name · Color"
  const parts: string[] = [];
  if (item.brand) parts.push(item.brand);
  if (item.name) parts.push(item.name);
  const head = parts.join(" ").trim();
  const headWithColor =
    item.colorName && item.colorName !== "Único"
      ? `${head} ${item.colorName}`.trim()
      : head;

  const sizeChunk =
    item.size && item.size.toUpperCase() !== "ÚNICA" && item.size.toUpperCase() !== "UNICA"
      ? ` · Talla ${item.size}`
      : "";

  const qtyChunk = ` · ${item.qty} ud`;
  const unitPrice = formatPriceEs(item.price);
  return `${headWithColor}${sizeChunk}${qtyChunk} · ${unitPrice}`;
}

/**
 * Construye el cuerpo del mensaje. Si el carrito está vacío devuelve un
 * fallback genérico para que el usuario nunca se quede sin mensaje.
 */
export function buildCartWhatsAppMessage(items: CartItem[]): string {
  if (items.length === 0) {
    return "Hola, tengo una consulta sobre Zona Sport.";
  }

  const lines = items.map((item, idx) => `${idx + 1}. ${describeItem(item)}`);
  const total = totalPricePure(items);

  return [
    "Hola, quiero reservar esta selección:",
    "",
    ...lines,
    "",
    `Total: ${formatPriceEs(total)}`,
    "",
    "Gracias.",
  ].join("\n");
}
