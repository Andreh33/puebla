/**
 * Helpers para abrir conversaciones de WhatsApp con mensaje pre-relleno.
 * Usa NEXT_PUBLIC_WHATSAPP_NUMBER (formato 34689110691, sin signos).
 */

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "34689110691";

export function whatsappUrl(message: string, phone: string = WHATSAPP_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const WhatsAppMessages = {
  generic: () => "Hola, tengo una consulta sobre Zona Sport.",

  product: (
    productName: string,
    size?: string,
    extra?: { url?: string; price?: string; sku?: string | null },
  ) => {
    const skuChunk = extra?.sku ? ` (SKU: ${extra.sku})` : "";
    const sz = size ? ` (talla ${size})` : "";
    const pr = extra?.price ? ` — ${extra.price}` : "";
    const link = extra?.url ? `\n${extra.url}` : "";
    return `Hola, me interesa "${productName}"${skuChunk}${sz}${pr}. ¿Lo tenéis disponible?${link}`;
  },

  reservation: (
    productName: string,
    size?: string,
    extra?: { url?: string; price?: string; sku?: string | null },
  ) => {
    const skuChunk = extra?.sku ? ` (SKU: ${extra.sku})` : "";
    const sz = size ? ` (talla ${size})` : "";
    const pr = extra?.price ? ` — ${extra.price}` : "";
    const link = extra?.url ? `\n${extra.url}` : "";
    return `Hola, quiero reservar "${productName}"${skuChunk}${sz}${pr} para pasar a recogerlo por la tienda.${link}`;
  },

  contactFromPage: (pageTitle: string) =>
    `Hola, os escribo desde la página "${pageTitle}" de la web de Zona Sport.`,

  local: (municipio: string) =>
    `Hola, soy de ${municipio} y tengo una consulta sobre un producto.`,
};

/**
 * Genera el href de tipo tel: a partir del mismo número.
 */
export function telHref(phone: string = WHATSAPP_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `tel:+${cleanPhone}`;
}
