import { describe, it, expect, vi, beforeEach } from "vitest";
import { round2 } from "@/lib/pos/totals";

/**
 * Tests de performItemReturn (lib/pos/return-order.ts): devolución de UNA línea
 * de una venta TPV dentro de una transacción. Mockeamos un `tx` con estado en
 * memoria (un Order + sus líneas) para verificar: validaciones de canal/cantidad,
 * reposición de stock SOLO de esa línea, reducción de línea y totales, registro
 * en metadata.returns, y el paso a CANCELLED cuando se devuelve todo.
 * recomputeProductStock se mockea (su lógica se prueba aparte).
 */

const recompute = vi.fn(async () => ({ total: 0, hidden: false }));
vi.mock("@/lib/products/stock", () => ({
  recomputeProductStock: (...a: unknown[]) => recompute(...(a as [])),
}));

type Item = {
  id: string;
  productId: string | null;
  productName: string;
  metadata?: Record<string, unknown> | null;
  variantSize: string | null;
  quantity: number;
  subtotal: number;
};
type OrderRow = {
  id: string;
  status: string;
  deliveryMethod: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  total: number;
  subtotal: number;
  tax: number;
};

let order: OrderRow;
let items: Item[];
const sizeIncrements: Array<{ productId: string; size: string; qty: number }> = [];
const productIncrements: Array<{ productId: string; qty: number }> = [];

function applyDec(current: number, op: unknown): number {
  if (op && typeof op === "object" && "decrement" in (op as Record<string, unknown>)) {
    return round2(current - Number((op as { decrement: number }).decrement));
  }
  if (typeof op === "number") return op;
  return current;
}

// `tx` mock: refleja sobre el estado en memoria lo justo para las aserciones.
const tx = {
  order: {
    findUnique: vi.fn(async () => ({ ...order, items })),
    update: vi.fn(async (args: { data: Record<string, unknown> }) => {
      const d = args.data;
      if (d.total !== undefined) order.total = applyDec(order.total, d.total);
      if (d.subtotal !== undefined) order.subtotal = applyDec(order.subtotal, d.subtotal);
      if (d.tax !== undefined) order.tax = applyDec(order.tax, d.tax);
      if (typeof d.status === "string") order.status = d.status;
      if (d.notes !== undefined) order.notes = d.notes as string | null;
      if (d.metadata !== undefined) order.metadata = d.metadata as Record<string, unknown>;
      return order;
    }),
  },
  orderItem: {
    updateMany: vi.fn(
      async (args: {
        where: { id: string; quantity?: { gte: number } };
        data: { quantity?: { decrement: number }; subtotal?: { decrement: number } };
      }) => {
        const it = items.find((i) => i.id === args.where.id);
        const gte = args.where.quantity?.gte ?? 0;
        if (!it || it.quantity < gte) return { count: 0 };
        if (args.data.quantity?.decrement) it.quantity -= args.data.quantity.decrement;
        if (args.data.subtotal?.decrement) it.subtotal = round2(it.subtotal - args.data.subtotal.decrement);
        return { count: 1 };
      },
    ),
    aggregate: vi.fn(async () => ({
      _sum: { quantity: items.reduce((a, i) => a + i.quantity, 0) },
    })),
  },
  productSize: {
    updateMany: vi.fn(
      async (args: { where: { productId: string; size: string }; data: { stock: { increment: number } } }) => {
        sizeIncrements.push({ productId: args.where.productId, size: args.where.size, qty: args.data.stock.increment });
        return { count: 1 };
      },
    ),
  },
  product: {
    updateMany: vi.fn(
      async (args: { where: { id: string }; data: { stock: { increment: number } } }) => {
        productIncrements.push({ productId: args.where.id, qty: args.data.stock.increment });
        return { count: 1 };
      },
    ),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  sizeIncrements.length = 0;
  productIncrements.length = 0;
  order = {
    id: "o1",
    status: "PAID",
    deliveryMethod: "in_store",
    notes: null,
    metadata: { channel: "pos" },
    total: 39.98,
    subtotal: 33.04,
    tax: 6.94,
  };
  items = [
    { id: "i1", productId: "p1", productName: "Camiseta", variantSize: "M", quantity: 2, subtotal: 39.98 },
  ];
});

describe("performItemReturn — devolución de una línea de TPV", () => {
  it("rechaza pedidos que no son de tienda (online se reembolsa en Stripe)", async () => {
    order.deliveryMethod = "shipping";
    const { performItemReturn } = await import("@/lib/pos/return-order");
    await expect(
      performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 1 }),
    ).rejects.toThrow(/tienda/i);
  });

  it("rechaza devolver más unidades de las que quedan", async () => {
    const { performItemReturn } = await import("@/lib/pos/return-order");
    await expect(
      performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 5 }),
    ).rejects.toThrow(/unidad/i);
  });

  it("rechaza si el pedido ya está cancelado", async () => {
    order.status = "CANCELLED";
    const { performItemReturn } = await import("@/lib/pos/return-order");
    await expect(
      performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 1 }),
    ).rejects.toThrow(/cancelad|reembolsad/i);
  });

  it("devolución parcial: repone la talla, reduce línea y totales, mantiene PAID", async () => {
    const { performItemReturn } = await import("@/lib/pos/return-order");
    const res = await performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 1 });

    expect(res.status).toBe("PAID");
    expect(res.refundedAmount).toBe(19.99);
    expect(res.stockRestored).toBe(true);
    // Solo la talla M de p1, una unidad.
    expect(sizeIncrements).toEqual([{ productId: "p1", size: "M", qty: 1 }]);
    expect(recompute).toHaveBeenCalledTimes(1);
    // Línea reducida.
    expect(items[0]!.quantity).toBe(1);
    expect(items[0]!.subtotal).toBe(19.99);
    // Totales del pedido reducidos y consistentes (base+IVA=total).
    expect(order.total).toBe(19.99);
    expect(order.subtotal).toBe(16.52);
    expect(order.tax).toBe(3.47);
    expect(round2(order.subtotal + order.tax)).toBe(order.total);
    // Registro de la devolución, SIN marcar stockRestored del pedido entero.
    const meta = order.metadata as Record<string, unknown>;
    expect(Array.isArray(meta.returns)).toBe(true);
    expect((meta.returns as unknown[]).length).toBe(1);
    expect(meta.stockRestored).toBeUndefined();
  });

  it("devolución parcial NO marca el pedido como stockRestored (no bloquea 'Cancelar venta')", async () => {
    const { performItemReturn } = await import("@/lib/pos/return-order");
    await performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 1 });
    const meta = order.metadata as Record<string, unknown>;
    expect(meta.stockRestored).not.toBe(true);
  });

  it("al devolver la última unidad deja el pedido CANCELLED, totales a 0 y stock repuesto", async () => {
    const { performItemReturn } = await import("@/lib/pos/return-order");
    const res = await performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 2 });

    expect(res.status).toBe("CANCELLED");
    expect(res.refundedAmount).toBe(39.98);
    expect(sizeIncrements).toEqual([{ productId: "p1", size: "M", qty: 2 }]);
    expect(order.total).toBe(0);
    expect(order.subtotal).toBe(0);
    expect(order.tax).toBe(0);
    expect(order.status).toBe("CANCELLED");
    const meta = order.metadata as Record<string, unknown>;
    expect(meta.stockRestored).toBe(true);
  });

  it("producto sin talla repone Product.stock (no ProductSize)", async () => {
    items = [
      { id: "i1", productId: "p9", productName: "Balón", variantSize: null, quantity: 1, subtotal: 20.0 },
    ];
    order.total = 20.0;
    order.subtotal = 16.53;
    order.tax = 3.47;
    const { performItemReturn } = await import("@/lib/pos/return-order");
    await performItemReturn(tx as never, { orderId: "o1", itemId: "i1", qty: 1 });
    expect(productIncrements).toEqual([{ productId: "p9", qty: 1 }]);
    expect(sizeIncrements).toEqual([]);
  });

  it("ticket mixto: devolver la línea 2222 corrige el total sin tocar stock del catálogo", async () => {
    items = [
      {
        id: "catalog",
        productId: "p9",
        productName: "Balón",
        metadata: null,
        variantSize: null,
        quantity: 1,
        subtotal: 20,
      },
      {
        id: "open",
        productId: null,
        productName: "Cordones",
        metadata: { posOpenItemKind: "store_product" },
        variantSize: null,
        quantity: 1,
        subtotal: 10,
      },
    ];
    order.total = 30;
    order.subtotal = 24.79;
    order.tax = 5.21;

    const { performItemReturn } = await import("@/lib/pos/return-order");
    const res = await performItemReturn(tx as never, {
      orderId: "o1",
      itemId: "open",
      qty: 1,
    });

    expect(res.status).toBe("PAID");
    expect(res.refundedAmount).toBe(10);
    expect(res.stockRestored).toBe(true);
    expect(productIncrements).toEqual([]);
    expect(sizeIncrements).toEqual([]);
    expect(recompute).not.toHaveBeenCalled();
    expect(items.find((item) => item.id === "catalog")?.quantity).toBe(1);
    expect(order.total).toBe(20);
  });
});
