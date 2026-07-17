// @vitest-environment happy-dom

import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchModelsAction: vi.fn(),
  saveModelGridAction: vi.fn(),
}));

vi.mock("@/app/admin/modelos/_actions", () => ({
  searchModelsAction: (...args: unknown[]) => mocks.searchModelsAction(...args),
  saveModelGridAction: (...args: unknown[]) => mocks.saveModelGridAction(...args),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import { ModelosClient } from "@/app/admin/modelos/ModelosClient";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchModelsAction.mockResolvedValue({
    ok: true,
    data: [
      {
        key: "m:7487",
        name: "Producto simple",
        modelCode: "7487",
        sizeLabels: [],
        colors: [
          {
            productId: "product-7487",
            colorName: "Único",
            colorHex: null,
            mainImageUrl: null,
            status: "ACTIVE",
            stock: 6,
            retailPrice: 29.95,
            costPrice: 12.5,
            sizes: [],
          },
        ],
      },
    ],
  });
  mocks.saveModelGridAction.mockResolvedValue({ ok: true, data: { updated: 1 } });
});

afterEach(cleanup);

describe("ModelosClient", () => {
  it("muestra y guarda el stock total de un producto sin tallas", async () => {
    render(<ModelosClient />);

    fireEvent.change(screen.getByPlaceholderText(/Busca un modelo/i), {
      target: { value: "7487" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    const input = await screen.findByLabelText("Stock total de Único");
    expect(input).toHaveProperty("value", "6");
    expect(screen.getByRole("columnheader", { name: "Stock" })).toBeTruthy();

    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar modelo" }));

    await waitFor(() => {
      expect(mocks.saveModelGridAction).toHaveBeenCalledWith(
        expect.objectContaining({
          productStock: [{ productId: "product-7487", value: 9 }],
        }),
      );
    });
  });

  it("conserva la edición de stock por talla sin añadir la columna de stock total", async () => {
    mocks.searchModelsAction.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          key: "m:TAPLW2113P",
          name: "Producto con tallas",
          modelCode: "TAPLW2113P",
          sizeLabels: ["42"],
          colors: [
            {
              productId: "product-5555",
              colorName: "Negro",
              colorHex: "#000000",
              mainImageUrl: null,
              status: "ACTIVE",
              stock: 2,
              retailPrice: 49.95,
              costPrice: 20,
              sizes: [{ id: "size-42", size: "42", stock: 2 }],
            },
          ],
        },
      ],
    });
    render(<ModelosClient />);

    fireEvent.change(screen.getByPlaceholderText(/Busca un modelo/i), {
      target: { value: "5555" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    const input = await screen.findByDisplayValue("2");
    expect(screen.getByRole("columnheader", { name: "42" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Stock" })).toBeNull();

    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar modelo" }));

    await waitFor(() => {
      expect(mocks.saveModelGridAction).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: [{ sizeId: "size-42", value: 4 }],
          productStock: [],
        }),
      );
    });
  });
});
