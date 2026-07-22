import "server-only";

import { db } from "@/lib/db";
import { madridDayStart, madridMonthStartYmd } from "@/lib/dates";
import { nextMonthPeriod } from "@/lib/admin/monthly-operating-balance";
import { SOLD_STATUSES } from "@/lib/admin/sales-queries";

export type MonthlyOperatingSnapshot = {
  available: boolean;
  period: string;
  sales: number;
  supplierInvoices: number;
  paidSupplierInvoices: number;
  outstandingSupplierInvoices: number;
  invoiceCount: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = Number(typeof value === "object" ? String(value) : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateColumnStart(period: string): Date {
  return new Date(`${period}-01T00:00:00.000Z`);
}

/**
 * Foto del mes actual para el bloque financiero del dashboard.
 *
 * - Ventas: pedidos vendidos por `createdAt`, respetando el mes de Madrid.
 * - Facturas: facturas de proveedor por `issueDate` (columna DATE de Postgres).
 * - Pagado/pendiente: estado actual de los vencimientos de esas facturas.
 */
export async function getCurrentMonthOperatingSnapshot(): Promise<MonthlyOperatingSnapshot> {
  const period = madridMonthStartYmd().slice(0, 7);
  const nextPeriod = nextMonthPeriod(period);

  try {
    const [salesAggregate, invoices] = await Promise.all([
      db.order.aggregate({
        where: {
          status: { in: [...SOLD_STATUSES] },
          createdAt: {
            gte: madridDayStart(`${period}-01`),
            lt: madridDayStart(`${nextPeriod}-01`),
          },
        },
        _sum: { total: true },
      }),
      db.supplierInvoice.findMany({
        where: {
          issueDate: {
            gte: dateColumnStart(period),
            lt: dateColumnStart(nextPeriod),
          },
        },
        select: {
          dueDates: { select: { amount: true, paid: true } },
        },
      }),
    ]);

    const dueDates = invoices.flatMap((invoice) => invoice.dueDates);
    const supplierInvoices = roundMoney(
      dueDates.reduce((sum, due) => sum + asNumber(due.amount), 0),
    );
    const paidSupplierInvoices = roundMoney(
      dueDates.filter((due) => due.paid).reduce((sum, due) => sum + asNumber(due.amount), 0),
    );
    const outstandingSupplierInvoices = roundMoney(
      dueDates.filter((due) => !due.paid).reduce((sum, due) => sum + asNumber(due.amount), 0),
    );

    return {
      available: true,
      period,
      sales: roundMoney(asNumber(salesAggregate._sum.total)),
      supplierInvoices,
      paidSupplierInvoices,
      outstandingSupplierInvoices,
      invoiceCount: invoices.length,
    };
  } catch {
    return {
      available: false,
      period,
      sales: 0,
      supplierInvoices: 0,
      paidSupplierInvoices: 0,
      outstandingSupplierInvoices: 0,
      invoiceCount: 0,
    };
  }
}
