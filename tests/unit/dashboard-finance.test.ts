import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  salesAggregate: vi.fn(),
  dueDatesFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    order: { aggregate: mocks.salesAggregate },
    supplierInvoiceDueDate: { findMany: mocks.dueDatesFindMany },
  },
}));

vi.mock("@/lib/dates", () => ({
  madridMonthStartYmd: () => "2026-08-01",
  madridDayStart: (ymd: string) => new Date(`${ymd}T00:00:00.000Z`),
}));

vi.mock("@/lib/admin/sales-queries", () => ({
  SOLD_STATUSES: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"],
}));

import { getCurrentMonthOperatingSnapshot } from "@/lib/admin/dashboard-finance";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.salesAggregate.mockResolvedValue({ _sum: { total: "2500.00" } });
  mocks.dueDatesFindMany.mockResolvedValue([
    { invoiceId: "invoice-a", amount: "1000.00", paid: true },
    { invoiceId: "invoice-a", amount: "1000.00", paid: false },
    { invoiceId: "invoice-b", amount: "500.00", paid: false },
  ]);
});

describe("getCurrentMonthOperatingSnapshot", () => {
  it("cuenta solo las cuotas que vencen en el mes y no la factura completa", async () => {
    await expect(getCurrentMonthOperatingSnapshot()).resolves.toEqual({
      available: true,
      period: "2026-08",
      sales: 2500,
      supplierInvoices: 2500,
      paidSupplierInvoices: 1000,
      outstandingSupplierInvoices: 1500,
      invoiceCount: 2,
    });

    expect(mocks.dueDatesFindMany).toHaveBeenCalledWith({
      where: {
        dueDate: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lt: new Date("2026-09-01T00:00:00.000Z"),
        },
      },
      select: { invoiceId: true, amount: true, paid: true },
    });
  });
});
