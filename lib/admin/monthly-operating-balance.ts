export type MonthlyOperatingBalanceState = "positive" | "negative" | "balanced" | "empty";

export type MonthlyOperatingBalance = {
  sales: number;
  supplierInvoices: number;
  difference: number;
  state: MonthlyOperatingBalanceState;
};

/** "2026-12" → "2027-01". Se usa para límites mensuales exclusivos. */
export function nextMonthPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, month ?? 1, 1)).toISOString().slice(0, 7);
}

function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Saldo orientativo del mes: ventas registradas menos facturas de proveedores
 * emitidas en el mismo mes. No representa beneficio contable ni flujo de caja.
 */
export function calculateMonthlyOperatingBalance(
  salesInput: number,
  supplierInvoicesInput: number,
): MonthlyOperatingBalance {
  const sales = money(salesInput);
  const supplierInvoices = money(supplierInvoicesInput);
  const difference = money(sales - supplierInvoices);

  let state: MonthlyOperatingBalanceState;
  if (sales === 0 && supplierInvoices === 0) state = "empty";
  else if (difference > 0) state = "positive";
  else if (difference < 0) state = "negative";
  else state = "balanced";

  return { sales, supplierInvoices, difference, state };
}
