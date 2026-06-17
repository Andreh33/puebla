import { describe, it, expect, vi } from "vitest";
import { recomputeProductStock } from "@/lib/products/stock";

/**
 * Tests de recomputeProductStock. No requiere DB: pasamos un `tx` falso que
 * implementa solo los métodos que el helper usa (productSize.aggregate,
 * product.findUnique, product.update) y registramos las escrituras.
 *
 * El tipo Tx real es Prisma.TransactionClient; aquí usamos un stub mínimo y
 * casteamos a `any` al invocar (patrón habitual para helpers de Prisma).
 */

type FakeProduct = { stock: number; status: string };
type SizeAgg = { sum: number | null; count: number };

function makeTx(opts: { product: FakeProduct | null; agg: SizeAgg }) {
  const updateSpy = vi.fn();
  const tx = {
    productSize: {
      aggregate: vi.fn(async () => ({
        _sum: { stock: opts.agg.sum },
        _count: { _all: opts.agg.count },
      })),
    },
    product: {
      findUnique: vi.fn(async () => opts.product),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        updateSpy(args.data);
        return {};
      }),
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { tx: tx as any, updateSpy };
}

describe("recomputeProductStock", () => {
  it("con tallas: suma y sincroniza Product.stock", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 1, status: "ACTIVE" },
      agg: { sum: 7, count: 3 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 7, hidden: false });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]![0]).toEqual({ stock: 7 });
  });

  it("con tallas a 0 y ACTIVE → pasa a DRAFT (sellout)", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 5, status: "ACTIVE" },
      agg: { sum: 0, count: 2 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 0, hidden: true });
    expect(updateSpy.mock.calls[0]![0]).toEqual({ stock: 0, status: "DRAFT" });
  });

  it("sin tallas: usa Product.stock y NO toca stock", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 4, status: "ACTIVE" },
      agg: { sum: null, count: 0 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 4, hidden: false });
    // Sin tallas y con stock>0: no hay nada que actualizar.
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("sin tallas a 0 y ACTIVE → DRAFT (sin escribir stock)", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 0, status: "ACTIVE" },
      agg: { sum: null, count: 0 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 0, hidden: true });
    expect(updateSpy.mock.calls[0]![0]).toEqual({ status: "DRAFT" });
  });

  it("NO republica: total>0 pero status DRAFT se queda DRAFT", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 0, status: "DRAFT" },
      agg: { sum: 9, count: 2 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 9, hidden: false });
    // Solo sincroniza el agregado; jamás cambia status a ACTIVE.
    expect(updateSpy.mock.calls[0]![0]).toEqual({ stock: 9 });
    expect(updateSpy.mock.calls[0]![0]).not.toHaveProperty("status");
  });

  it("total 0 pero ya DRAFT: no oculta de nuevo (no escribe status)", async () => {
    const { tx, updateSpy } = makeTx({
      product: { stock: 0, status: "DRAFT" },
      agg: { sum: 0, count: 1 },
    });
    const res = await recomputeProductStock(tx, "p1");
    expect(res).toEqual({ total: 0, hidden: false });
    // Solo sincroniza stock=0; no toca status (ya está DRAFT).
    expect(updateSpy.mock.calls[0]![0]).toEqual({ stock: 0 });
  });

  it("producto inexistente → {total:0, hidden:false} sin update", async () => {
    const { tx, updateSpy } = makeTx({ product: null, agg: { sum: 3, count: 1 } });
    const res = await recomputeProductStock(tx, "nope");
    expect(res).toEqual({ total: 0, hidden: false });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
