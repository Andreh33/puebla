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

/** Importe pagado de la factura (suma de los vencimientos pagados). */
export function invoicePaid(dues: DueDateLike[]): number {
  return round2(dues.filter((d) => d.paid).reduce((s, d) => s + d.amount, 0));
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

/** Total facturado (suma de TODOS los importes, pagados o no). */
export function totalInvoiced(invoices: InvoiceLike[]): number {
  return round2(invoices.reduce((s, inv) => s + invoiceTotal(inv.dueDates), 0));
}

/** Total pagado (suma de los vencimientos ya pagados) en todas las facturas. */
export function totalPaid(invoices: InvoiceLike[]): number {
  return round2(invoices.reduce((s, inv) => s + invoicePaid(inv.dueDates), 0));
}

// ---------------------------------------------------------------------------
// Agregaciones y filtro para el panel (facturado / pagado / pendiente por
// mes y por proveedor). Operan sobre objetos que llevan la fecha de emisión y
// el proveedor, además de los vencimientos.
// ---------------------------------------------------------------------------

/** Objeto mínimo filtrable/agregable. `T` puede ser el DTO completo de la UI. */
export type FilterableInvoice = {
  supplier: string;
  invoiceNumber: string | null;
  concept: string | null;
  brandLabel?: string | null;
  issueDate: string; // YYYY-MM-DD (fecha de la factura)
  dueDates: DueDateLike[];
};

export type MonthSpend = { ym: string; facturado: number; pagado: number; pendiente: number };
export type SupplierSpend = { supplier: string; facturado: number; pagado: number; pendiente: number; count: number };

/** Gasto agrupado por mes de EMISIÓN (YYYY-MM), orden cronológico ascendente. */
export function spendByMonth(invoices: FilterableInvoice[]): MonthSpend[] {
  const m = new Map<string, { facturado: number; pagado: number; pendiente: number }>();
  for (const inv of invoices) {
    const ym = inv.issueDate.slice(0, 7);
    const acc = m.get(ym) ?? { facturado: 0, pagado: 0, pendiente: 0 };
    acc.facturado += invoiceTotal(inv.dueDates);
    acc.pagado += invoicePaid(inv.dueDates);
    acc.pendiente += invoiceOutstanding(inv.dueDates);
    m.set(ym, acc);
  }
  return [...m.entries()]
    .map(([ym, v]) => ({ ym, facturado: round2(v.facturado), pagado: round2(v.pagado), pendiente: round2(v.pendiente) }))
    .sort((a, b) => a.ym.localeCompare(b.ym));
}

/** Gasto agrupado por proveedor, orden descendente por importe facturado. */
export function spendBySupplier(invoices: FilterableInvoice[]): SupplierSpend[] {
  const m = new Map<string, { facturado: number; pagado: number; pendiente: number; count: number }>();
  for (const inv of invoices) {
    const key = inv.supplier.trim() || "—";
    const acc = m.get(key) ?? { facturado: 0, pagado: 0, pendiente: 0, count: 0 };
    acc.facturado += invoiceTotal(inv.dueDates);
    acc.pagado += invoicePaid(inv.dueDates);
    acc.pendiente += invoiceOutstanding(inv.dueDates);
    acc.count += 1;
    m.set(key, acc);
  }
  return [...m.entries()]
    .map(([supplier, v]) => ({
      supplier,
      facturado: round2(v.facturado),
      pagado: round2(v.pagado),
      pendiente: round2(v.pendiente),
      count: v.count,
    }))
    .sort((a, b) => b.facturado - a.facturado || a.supplier.localeCompare(b.supplier));
}

export type InvoiceFilter = {
  supplier: string; // "" = todos; si no, coincidencia exacta (case-insensitive)
  from: string; // "" o YYYY-MM-DD (issueDate >= from)
  to: string; // "" o YYYY-MM-DD (issueDate <= to)
  min: number | null; // total mínimo de la factura (inclusive)
  max: number | null; // total máximo de la factura (inclusive)
  status: "all" | InvoiceStatus;
  text: string; // busca en proveedor / nº factura / concepto / marca
  today: string; // YYYY-MM-DD, para calcular el estado
};

/** Filtra facturas por proveedor + rango de fechas + rango de importe (total)
 *  + estado + texto, todo combinado con AND. Devuelve el mismo tipo de entrada. */
export function filterInvoices<T extends FilterableInvoice>(invoices: T[], f: InvoiceFilter): T[] {
  const q = f.text.trim().toLowerCase();
  const sup = f.supplier.trim().toLowerCase();
  return invoices.filter((inv) => {
    if (sup && inv.supplier.trim().toLowerCase() !== sup) return false;
    if (f.from && inv.issueDate < f.from) return false;
    if (f.to && inv.issueDate > f.to) return false;
    if (f.status !== "all" && invoiceStatus(inv.dueDates, f.today) !== f.status) return false;
    if (f.min !== null || f.max !== null) {
      const total = invoiceTotal(inv.dueDates);
      if (f.min !== null && total < f.min) return false;
      if (f.max !== null && total > f.max) return false;
    }
    if (q) {
      const hay = [inv.supplier, inv.invoiceNumber, inv.concept, inv.brandLabel].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
      if (!hay) return false;
    }
    return true;
  });
}
