// @vitest-environment happy-dom

import * as React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { BalanceClient } from "@/app/admin/balance/BalanceClient";
import type { BalanceData, Metrics } from "@/lib/admin/balance-types";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const emptyMetrics: Metrics = { coste: 0, stock: 0, vendidas: 0, ventas: 0, beneficio: 0 };

function balanceData(): BalanceData {
  return {
    period: "mes",
    families: ["textil", "calzado", "complemento"].map((family) => ({
      family: family as "textil" | "calzado" | "complemento",
      rows: [],
      total: emptyMetrics,
    })),
    byGender: [],
    grandTotal: emptyMetrics,
    paymentMethods: [],
    profitByMonth: [
      {
        month: "2026-07",
        label: "jul 26",
        ventas: 500,
        beneficio: 200,
        pagos: 75,
        diferencia: 125,
      },
      {
        month: "2026-08",
        label: "ago 26",
        ventas: 300,
        beneficio: 100,
        pagos: 150,
        diferencia: -50,
      },
    ],
  };
}

describe("BalanceClient · beneficio por mes", () => {
  it("muestra pagos y diferencia con signo, además de sus totales", () => {
    render(<BalanceClient data={balanceData()} />);

    const heading = screen.getByRole("heading", { name: "Beneficio por mes" });
    const card = heading.closest("section");
    expect(card).toBeTruthy();
    const table = within(card as HTMLElement);

    expect(table.getByRole("columnheader", { name: "Pagos" })).toBeTruthy();
    expect(table.getByRole("columnheader", { name: "Diferencia" })).toBeTruthy();
    expect(table.getByText(/\+125,00/)).toBeTruthy();
    expect(table.getByText(/-50,00/)).toBeTruthy();
    expect(table.getByText(/225,00/)).toBeTruthy();
    expect(table.getByText(/\+75,00/)).toBeTruthy();
  });
});
