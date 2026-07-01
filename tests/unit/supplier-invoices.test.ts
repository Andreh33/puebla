import { describe, it, expect } from "vitest";
import {
  invoiceTotal,
  invoiceOutstanding,
  invoicePaid,
  invoiceStatus,
  totalOutstanding,
  totalInvoiced,
  totalPaid,
  outstandingInMonth,
  spendByMonth,
  spendBySupplier,
  filterInvoices,
  type FilterableInvoice,
  type InvoiceFilter,
} from "@/lib/admin/supplier-invoices";

const due = (amount: number, paid: boolean, dueDate: string) => ({ amount, paid, dueDate });

/** Helper para construir una factura filtrable con valores por defecto. */
const inv = (o: Partial<FilterableInvoice> & { dueDates: FilterableInvoice["dueDates"] }): FilterableInvoice => ({
  supplier: "Nike",
  invoiceNumber: null,
  concept: null,
  brandLabel: null,
  issueDate: "2026-07-01",
  ...o,
});

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

describe("invoicePaid", () => {
  it("suma solo los vencimientos pagados", () => {
    expect(invoicePaid([due(100, true, "2026-07-01"), due(50, false, "2026-08-01")])).toBe(100);
  });
  it("admite importes negativos (abonos)", () => {
    expect(invoicePaid([due(100, true, "2026-07-01"), due(-30, true, "2026-08-01")])).toBe(70);
  });
});

describe("totalInvoiced / totalPaid", () => {
  const invoices = [
    { dueDates: [due(100, true, "2026-07-01"), due(50, false, "2026-08-01")] },
    { dueDates: [due(200, true, "2026-07-01")] },
  ];
  it("totalInvoiced suma todos los importes", () => {
    expect(totalInvoiced(invoices)).toBe(350);
  });
  it("totalPaid suma solo lo pagado", () => {
    expect(totalPaid(invoices)).toBe(300);
  });
});

describe("spendByMonth", () => {
  it("agrupa por mes de emisión y ordena cronológicamente", () => {
    const rows = [
      inv({ issueDate: "2026-07-05", dueDates: [due(100, true, "2026-08-01"), due(100, false, "2026-09-01")] }),
      inv({ issueDate: "2026-07-20", dueDates: [due(50, false, "2026-08-01")] }),
      inv({ issueDate: "2026-06-10", dueDates: [due(300, true, "2026-07-01")] }),
    ];
    expect(spendByMonth(rows)).toEqual([
      { ym: "2026-06", facturado: 300, pagado: 300, pendiente: 0 },
      { ym: "2026-07", facturado: 250, pagado: 100, pendiente: 150 },
    ]);
  });
});

describe("spendBySupplier", () => {
  it("agrupa por proveedor y ordena por facturado desc", () => {
    const rows = [
      inv({ supplier: "Nike", dueDates: [due(100, true, "2026-08-01")] }),
      inv({ supplier: "Adidas", dueDates: [due(500, false, "2026-08-01")] }),
      inv({ supplier: "Nike", dueDates: [due(50, false, "2026-08-01")] }),
    ];
    const out = spendBySupplier(rows);
    expect(out.map((s) => s.supplier)).toEqual(["Adidas", "Nike"]);
    expect(out.find((s) => s.supplier === "Nike")).toMatchObject({ facturado: 150, pagado: 100, pendiente: 50, count: 2 });
  });
});

describe("filterInvoices", () => {
  const base: InvoiceFilter = {
    supplier: "",
    from: "",
    to: "",
    min: null,
    max: null,
    status: "all",
    text: "",
    today: "2026-07-01",
  };
  const rows = [
    inv({ supplier: "Nike", issueDate: "2026-05-10", invoiceNumber: "A-1", dueDates: [due(100, false, "2026-06-01")] }),
    inv({ supplier: "Adidas", issueDate: "2026-06-15", concept: "botas", dueDates: [due(500, false, "2026-09-01")] }),
    inv({ supplier: "Nike", issueDate: "2026-07-01", dueDates: [due(50, true, "2026-07-01")] }),
  ];

  it("filtra por proveedor (case-insensitive)", () => {
    expect(filterInvoices(rows, { ...base, supplier: "nike" })).toHaveLength(2);
  });
  it("filtra por rango de fechas de emisión (inclusive)", () => {
    const out = filterInvoices(rows, { ...base, from: "2026-06-01", to: "2026-06-30" });
    expect(out.map((r) => r.supplier)).toEqual(["Adidas"]);
  });
  it("filtra por rango de importe TOTAL de la factura", () => {
    const out = filterInvoices(rows, { ...base, min: 200, max: null });
    expect(out.map((r) => r.supplier)).toEqual(["Adidas"]);
  });
  it("combina fecha + importe simultáneamente (AND)", () => {
    const out = filterInvoices(rows, { ...base, from: "2026-05-01", to: "2026-06-30", min: 90, max: 150 });
    expect(out.map((r) => r.invoiceNumber)).toEqual(["A-1"]);
  });
  it("busca en concepto / nº factura", () => {
    expect(filterInvoices(rows, { ...base, text: "botas" })).toHaveLength(1);
    expect(filterInvoices(rows, { ...base, text: "a-1" })).toHaveLength(1);
  });
  it("filtra por estado (pagada)", () => {
    expect(filterInvoices(rows, { ...base, status: "paid" })).toHaveLength(1);
  });
});
