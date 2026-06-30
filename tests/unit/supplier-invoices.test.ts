import { describe, it, expect } from "vitest";
import {
  invoiceTotal,
  invoiceOutstanding,
  invoiceStatus,
  totalOutstanding,
  outstandingInMonth,
} from "@/lib/admin/supplier-invoices";

const due = (amount: number, paid: boolean, dueDate: string) => ({ amount, paid, dueDate });

describe("invoiceTotal", () => {
  it("suma todos los importes de los vencimientos", () => {
    expect(invoiceTotal([due(100, false, "2026-07-01"), due(50, true, "2026-08-01")])).toBe(150);
  });
  it("es 0 sin vencimientos", () => {
    expect(invoiceTotal([])).toBe(0);
  });
  it("redondea a 2 decimales (evita 0.30000000004)", () => {
    expect(invoiceTotal([due(0.1, false, "2026-07-01"), due(0.2, false, "2026-07-01")])).toBe(0.3);
  });
});

describe("invoiceOutstanding", () => {
  it("suma solo los vencimientos NO pagados", () => {
    expect(invoiceOutstanding([due(100, false, "2026-07-01"), due(50, true, "2026-08-01")])).toBe(100);
  });
});

describe("invoiceStatus", () => {
  it("'empty' si no hay vencimientos", () => {
    expect(invoiceStatus([], "2026-06-30")).toBe("empty");
  });
  it("'paid' si todos están pagados", () => {
    expect(invoiceStatus([due(100, true, "2026-07-01")], "2026-06-30")).toBe("paid");
  });
  it("'overdue' si hay un no pagado con vencimiento ya pasado", () => {
    expect(invoiceStatus([due(100, false, "2026-06-01")], "2026-06-30")).toBe("overdue");
  });
  it("'pending' si hay no pagados pero ninguno vencido aún", () => {
    expect(invoiceStatus([due(100, false, "2026-07-15")], "2026-06-30")).toBe("pending");
  });
  it("un vencimiento que vence HOY aún no está vencido → 'pending'", () => {
    expect(invoiceStatus([due(100, false, "2026-06-30")], "2026-06-30")).toBe("pending");
  });
  it("mezcla pagado + no pagado vencido → 'overdue'", () => {
    expect(
      invoiceStatus([due(50, true, "2026-05-01"), due(50, false, "2026-06-01")], "2026-06-30"),
    ).toBe("overdue");
  });
});

describe("totalOutstanding", () => {
  it("suma lo no pagado de todas las facturas", () => {
    const invoices = [
      { dueDates: [due(100, false, "2026-07-01"), due(100, true, "2026-06-01")] },
      { dueDates: [due(50, false, "2026-08-01")] },
    ];
    expect(totalOutstanding(invoices)).toBe(150);
  });
});

describe("outstandingInMonth", () => {
  it("suma lo no pagado que vence en el mes dado (YYYY-MM)", () => {
    const invoices = [
      { dueDates: [due(100, false, "2026-07-10"), due(200, false, "2026-08-01")] },
      { dueDates: [due(50, true, "2026-07-20")] }, // pagado → no cuenta
      { dueDates: [due(30, false, "2026-07-25")] },
    ];
    expect(outstandingInMonth(invoices, "2026-07")).toBe(130);
  });
});
