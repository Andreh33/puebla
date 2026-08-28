import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderItemsFindMany: vi.fn(),
  productsFindMany: vi.fn(),
  supplierDueDatesFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    orderItem: { findMany: mocks.orderItemsFindMany },
    product: { findMany: mocks.productsFindMany },
    supplierInvoiceDueDate: { findMany: mocks.supplierDueDatesFindMany },
  },
}));

vi.mock("@/lib/admin/sales-queries", () => ({
  SOLD_STATUSES: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"],
}));

import { getProfitByMonth } from "@/lib/admin/balance-queries";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-28T10:00:00.000Z"));
  vi.clearAllMocks();

  mocks.orderItemsFindMany.mockResolvedValue([
    {
      quantity: 1,
      unitPrice: "100.00",
      unitCost: "40.00",
      subtotal: "100.00",
      productId: null,
      order: { createdAt: new Date("2026-06-10T10:00:00.000Z") },
    },
    {
      quantity: 2,
      unitPrice: "50.00",
      unitCost: null,
      subtotal: "100.00",
      productId: "product-1",
      order: { createdAt: new Date("2026-07-20T10:00:00.000Z") },
    },
  ]);
  mocks.productsFindMany.mockResolvedValue([{ id: "product-1", costPrice: "20.00" }]);
  mocks.supplierDueDatesFindMany.mockResolvedValue([
    { dueDate: new Date("2026-06-30T00:00:00.000Z"), amount: "30.00" },
    { dueDate: new Date("2026-07-15T00:00:00.000Z"), amount: "75.00" },
    { dueDate: new Date("2026-08-10T00:00:00.000Z"), amount: "90.00" },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getProfitByMonth", () => {
  it("resta en cada mes las cuotas que vencen en ese mes", async () => {
    await expect(getProfitByMonth(3)).resolves.toEqual([
      { month: "2026-06", label: "jun 26", ventas: 100, beneficio: 60, pagos: 30, diferencia: 30 },
      { month: "2026-07", label: "jul 26", ventas: 100, beneficio: 60, pagos: 75, diferencia: -15 },
      { month: "2026-08", label: "ago 26", ventas: 0, beneficio: 0, pagos: 90, diferencia: -90 },
    ]);

    expect(mocks.supplierDueDatesFindMany).toHaveBeenCalledWith({
      where: {
        dueDate: {
          gte: new Date("2026-06-01T00:00:00.000Z"),
          lt: new Date("2026-09-01T00:00:00.000Z"),
        },
      },
      select: { dueDate: true, amount: true },
    });

    expect(mocks.orderItemsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          order: {
            status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
            createdAt: {
              gte: new Date("2026-05-31T22:00:00.000Z"),
              lt: new Date("2026-08-31T22:00:00.000Z"),
            },
          },
        },
      }),
    );
  });

  it("agrupa en el mes de Madrid las ventas cercanas a medianoche", async () => {
    vi.setSystemTime(new Date("2026-09-02T10:00:00.000Z"));
    mocks.orderItemsFindMany.mockResolvedValue([
      {
        quantity: 1,
        unitPrice: "10.00",
        unitCost: "0.00",
        subtotal: "10.00",
        productId: null,
        order: { createdAt: new Date("2026-08-31T21:59:00.000Z") },
      },
      {
        quantity: 1,
        unitPrice: "10.00",
        unitCost: "0.00",
        subtotal: "10.00",
        productId: null,
        order: { createdAt: new Date("2026-08-31T22:01:00.000Z") },
      },
    ]);
    mocks.supplierDueDatesFindMany.mockResolvedValue([]);

    await expect(getProfitByMonth(2)).resolves.toEqual([
      { month: "2026-08", label: "ago 26", ventas: 10, beneficio: 10, pagos: 0, diferencia: 10 },
      { month: "2026-09", label: "sep 26", ventas: 10, beneficio: 10, pagos: 0, diferencia: 10 },
    ]);
  });
});
