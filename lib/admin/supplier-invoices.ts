/**
 * Cálculos puros de facturas de proveedores (cuentas por pagar). Sin acceso a
 * BD ni DOM: la UI (servidor y cliente) y los tests los comparten.
 *
 * Las fechas se manejan como cadenas `YYYY-MM-DD`, que se ordenan
 * lexicográficamente igual que cronológicamente → comparación de vencimiento
 * sin problemas de zona horaria.
 */

export type DueDateLike = { amount: number; paid: boolean; dueDate: string };
export type InvoiceLike = { dueDates: DueDateLike[] };

/** "paid": todo pagado · "overdue": algún pendiente ya vencido · "pending":
 *  pendientes sin vencer · "empty": sin vencimientos. */
export type InvoiceStatus = "paid" | "pending" | "overdue" | "empty";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Importe total de la factura (suma de todos sus vencimientos). */
export function invoiceTotal(dues: DueDateLike[]): number {
  return round2(dues.reduce((s, d) => s + d.amount, 0));
}

/** Importe pendiente de la factura (suma de los vencimientos NO pagados). */
export function invoiceOutstanding(dues: DueDateLike[]): number {
  return round2(dues.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0));
}

/** Estado para colorear la fila. `today` en formato YYYY-MM-DD. */
export function invoiceStatus(dues: DueDateLike[], today: string): InvoiceStatus {
  if (dues.length === 0) return "empty";
  const unpaid = dues.filter((d) => !d.paid);
  if (unpaid.length === 0) return "paid";
  if (unpaid.some((d) => d.dueDate < today)) return "overdue";
  return "pending";
}

/** Total que se debe (pendiente) en TODAS las facturas. */
export function totalOutstanding(invoices: InvoiceLike[]): number {
  return round2(invoices.reduce((s, inv) => s + invoiceOutstanding(inv.dueDates), 0));
}

/** Total pendiente cuyos vencimientos caen en el mes `ym` (formato YYYY-MM). */
export function outstandingInMonth(invoices: InvoiceLike[], ym: string): number {
  let sum = 0;
  for (const inv of invoices) {
    for (const d of inv.dueDates) {
      if (!d.paid && d.dueDate.startsWith(ym)) sum += d.amount;
    }
  }
  return round2(sum);
}
