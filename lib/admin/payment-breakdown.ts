/**
 * Desglose de ventas por método de pago para /admin/balance.
 *
 * Puro (sin "server-only"): agrupa pedidos por su etiqueta de método usando el
 * helper compartido `paymentMethodLabel`, de modo que método→etiqueta tiene una
 * única fuente de verdad (DRY). Testeable sin DB. La query que lo alimenta vive
 * en lib/admin/balance-queries.ts.
 */

import { paymentMethodLabel } from "@/lib/stripe/payment-method";

export type PaymentMethodRow = {
  /** "Tarjeta" | "Bizum" | "PayPal" | "TPV" | "Online (sin especificar)". */
  label: string;
  /** Nº de pedidos con este método en el periodo. */
  pedidos: number;
  /** Dinero cobrado (Σ order.total, €), 2 decimales. */
  importe: number;
  /** % del importe total del periodo, 1 decimal. */
  pct: number;
};

/** Pedido de entrada (ya con el método extraído de metadata). */
export type PaymentBreakdownOrder = {
  total: number;
  paymentMethod: string | null;
  deliveryMethod: string | null;
};

// El helper devuelve "Online" para pedidos online sin método capturado; en esta
// vista lo mostramos más explícito para que no se confunda con un método real.
const DISPLAY_LABEL: Record<string, string> = {
  Online: "Online (sin especificar)",
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Agrupa los pedidos por método de pago y devuelve, por cubo, nº de pedidos,
 * importe (€) y % del total, ordenado por importe descendente. Los cubos se
 * derivan de `paymentMethodLabel` (Bizum/PayPal/Tarjeta/TPV/Online), sumando el
 * 100% de los pedidos recibidos.
 */
export function buildPaymentBreakdown(orders: PaymentBreakdownOrder[]): PaymentMethodRow[] {
  const groups = new Map<string, { pedidos: number; importe: number }>();
  for (const o of orders) {
    const key = paymentMethodLabel(o.paymentMethod, o.deliveryMethod);
    const g = groups.get(key) ?? { pedidos: 0, importe: 0 };
    g.pedidos += 1;
    g.importe += Number.isFinite(o.total) ? o.total : 0;
    groups.set(key, g);
  }

  const total = [...groups.values()].reduce((a, g) => a + g.importe, 0);

  const rows: PaymentMethodRow[] = [...groups.entries()].map(([key, g]) => ({
    label: DISPLAY_LABEL[key] ?? key,
    pedidos: g.pedidos,
    importe: r2(g.importe),
    pct: total > 0 ? r1((g.importe / total) * 100) : 0,
  }));

  rows.sort((a, b) => b.importe - a.importe || a.label.localeCompare(b.label, "es"));
  return rows;
}
