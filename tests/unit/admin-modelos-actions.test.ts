import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  productFindMany: vi.fn(),
  transaction: vi.fn(),
  productSizeUpdate: vi.fn(),
  productUpdateMany: vi.fn(),
  productUpdate: vi.fn(),
  recomputeProductStock: vi.fn(),
}));

const tx = {
  productSize: { update: (...args: unknown[]) => mocks.productSizeUpdate(...args) },
  product: {
    updateMany: (...args: unknown[]) => mocks.productUpdateMany(...args),
    update: (...args: unknown[]) => mocks.productUpdate(...args),
  },
};

vi.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => mocks.auth(...args) }));
vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: (...args: unknown[]) => mocks.productFindMany(...args) },
    $transaction: (...args: unknown[]) => mocks.transaction(...args),
  },
}));
vi.mock("@/lib/products/stock", () => ({
  recomputeProductStock: (...args: unknown[]) => mocks.recomputeProductStock(...args),
}));

import { saveModelGridAction, searchModelsAction } from "@/app/admin/modelos/_actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin-1" } });
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  mocks.recomputeProductStock.mockResolvedValue({ total: 0, hidden: false });
});

describe("searchModelsAction", () => {
  it("incluye el stock total de los productos sin tallas", async () => {
    mocks.productFindMany.mockResolvedValue([
      {
        id: "product-7487",
        name: "Producto simple",
        colorName: "Único",
        colorHex: null,
        mainImageUrl: null,
        status: "ACTIVE",
        modelCode: "7487",
        stock: 6,
        retailPrice: "29.95",
        costPrice: "12.50",
        sizes: [],
      },
    ]);

    const result = await searchModelsAction("7487");

    expect(result).toEqual({
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
    expect(mocks.productFindMany.mock.calls[0]?.[0]).toMatchObject({
      select: { stock: true },
    });
  });
});

describe("saveModelGridAction", () => {
  it("actualiza y recalcula el stock de un producto que sigue sin tallas", async () => {
    mocks.productUpdateMany.mockResolvedValue({ count: 1 });

    const result = await saveModelGridAction({
      productStock: [{ productId: "product-7487", value: 9 }],
    });

    expect(result).toEqual({ ok: true, data: { updated: 1 } });
    expect(mocks.productUpdateMany).toHaveBeenCalledWith({
      where: { id: "product-7487", sizes: { none: {} } },
      data: { stock: 9 },
    });
    expect(mocks.recomputeProductStock).toHaveBeenCalledWith(tx, "product-7487");
  });

  it("rechaza el stock total si el producto ya tiene tallas", async () => {
    mocks.productUpdateMany.mockResolvedValue({ count: 0 });

    const result = await saveModelGridAction({
      productStock: [{ productId: "product-7487", value: 9 }],
    });

    expect(result).toEqual({
      ok: false,
      error:
        "No se pudo actualizar el stock: el producto no existe o ya tiene tallas. Vuelve a buscarlo.",
    });
    expect(mocks.recomputeProductStock).not.toHaveBeenCalled();
  });

  it("mantiene el guardado existente de stock por talla", async () => {
    mocks.productSizeUpdate.mockResolvedValue({ productId: "product-5555" });

    const result = await saveModelGridAction({
      stock: [{ sizeId: "size-42", value: 3 }],
    });

    expect(result).toEqual({ ok: true, data: { updated: 1 } });
    expect(mocks.productSizeUpdate).toHaveBeenCalledWith({
      where: { id: "size-42" },
      data: { stock: 3 },
      select: { productId: true },
    });
    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
    expect(mocks.recomputeProductStock).toHaveBeenCalledWith(tx, "product-5555");
  });

  it("no escribe valores de stock inválidos", async () => {
    const result = await saveModelGridAction({
      productStock: [{ productId: "product-7487", value: 1_000_001 }],
    });

    expect(result).toEqual({ ok: false, error: "Stock máximo 1 000 000" });
    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
    expect(mocks.recomputeProductStock).not.toHaveBeenCalled();
  });
});
