// @vitest-environment happy-dom

import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonthlyOperatingBalanceCard } from "@/components/admin/MonthlyOperatingBalanceCard";
import type { MonthlyOperatingSnapshot } from "@/lib/admin/dashboard-finance";

afterEach(cleanup);

function snapshot(values: Partial<MonthlyOperatingSnapshot> = {}): MonthlyOperatingSnapshot {
  return {
    available: true,
    period: "2026-07",
    sales: 400,
    supplierInvoices: 725.5,
    paidSupplierInvoices: 500,
    outstandingSupplierInvoices: 225.5,
    invoiceCount: 2,
    ...values,
  };
}

describe("MonthlyOperatingBalanceCard", () => {
  it("explica el resultado negativo con importes y texto, no solo con color", () => {
    render(<MonthlyOperatingBalanceCard snapshot={snapshot()} />);

    expect(screen.getByText("En negativo")).toBeTruthy();
    expect(screen.getByText(/325,50/)).toBeTruthy();
    expect(screen.getByText("Ventas registradas")).toBeTruthy();
    expect(screen.getByText("Facturas de proveedores", { selector: "span" })).toBeTruthy();
    expect(screen.getByText(/No es beneficio contable/)).toBeTruthy();
  });

  it("no muestra un saldo parcial cuando la consulta no está disponible", () => {
    render(<MonthlyOperatingBalanceCard snapshot={snapshot({ available: false })} />);

    expect(screen.getByText("No se pudo calcular el balance")).toBeTruthy();
    expect(screen.queryByText("En negativo")).toBeNull();
  });
});
