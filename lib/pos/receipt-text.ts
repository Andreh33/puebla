import { STORE_NAP } from "@/lib/seo/schema-org";

export type ReceiptData = {
  ticketNumber: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    description?: string | null;
    variantSize: string | null;
    productSku: string;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "bizum";
  ticketUrl: string | null;
};

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const PAY_LABEL: Record<ReceiptData["paymentMethod"], string> = {
  efectivo: "Efectivo", tarjeta: "Tarjeta", bizum: "Bizum",
};

/** Comprobante en texto plano para WhatsApp (no fiscal). */
export function buildReceiptText(r: ReceiptData): string {
  const date = r.createdAt.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const lines = r.items.map((it) => {
    const size = it.variantSize ? ` (talla ${it.variantSize})` : "";
    const description = it.description ? `\n  ${it.description}` : "";
    return `• ${it.quantity}× ${it.productName}${size} — ${it.productSku} — ${eur(it.subtotal)}${description}`;
  });
  const out = [
    `*Zona Sport* — Comprobante ${r.ticketNumber}`,
    `${STORE_NAP.streetAddress}, ${STORE_NAP.postalCode} ${STORE_NAP.addressLocality}`,
    date,
    "",
    ...lines,
    "",
    `Base: ${eur(r.subtotal)}  ·  IVA: ${eur(r.tax)}`,
    `*Total: ${eur(r.total)}*  (${PAY_LABEL[r.paymentMethod]})`,
    "",
    "Comprobante de venta — no es factura. Solicítala en tienda con tus datos fiscales.",
  ];
  if (r.ticketUrl) out.push("", `Ver ticket: ${r.ticketUrl}`);
  return out.join("\n");
}
