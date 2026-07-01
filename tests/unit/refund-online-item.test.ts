import { describe, it, expect, vi, beforeEach } from "vitest";
import { round2 } from "@/lib/pos/totals";

/**
 * Tests de performOnlineItemRefund (lib/pos/refund-online.ts): contabilización
 * en BD del reembolso Stripe de UNA línea de un pedido ONLINE. Mockeamos un `tx`
 * con estado en memoria para verificar: validación de canal (rechaza TPV),
 * reposición OPCIONAL de stock (restock), reducción de línea/totales, registro
 * en metadata.returns con stripeRefundId, idempotencia por refund id y el paso a
 * REFUNDED al reembolsar la última unidad. recomputeProductStock se mockea.
 */

const recompute = vi.fn(async () => ({ total: 0, hidden: false }));
vi.mock("@/lib/products/stock", () => ({
  recomputeProductStock: (...a: unknown[]) => recompute(...(a as [])),
}));

type Item = {
  id: string;
  productId: string | null;
  productName: string;
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
    aggregate: vi.fn(async () => ({ _sum: { quantity: items.reduce((a, i) => a + i.quantity, 0) } })),
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
    deliveryMethod: "shipping",
    notes: null,
    metadata: { source: "zonasport-web" },
    total: 39.98,
    subtotal: 33.04,
    tax: 6.94,
  };
  items = [
    { id: "i1", productId: "p1", productName: "Camiseta", variantSize: "M", quantity: 2, subtotal: 39.98 },
  ];
});

const P = (over?: Partial<{ itemId: string; qty: number; restock: boolean; stripeRefundId: string }>) => ({
  orderId: "o1",
  itemId: "i1",
  qty: 1,
  restock: true,
  stripeRefundId: "re_1",
  ...over,
});

describe("performOnlineItemRefund — reembolso Stripe de una línea online", () => {
  it("rechaza pedidos de TPV (usan «Devolver»)", async () => {
    order.deliveryMethod = "in_store";
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    await expect(performOnlineItemRefund(tx as never, P())).rejects.toThrow(/tienda|TPV/i);
  });

  it("rechaza reembolsar más unidades de las que quedan", async () => {
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    await expect(performOnlineItemRefund(tx as never, P({ qty: 5 }))).rejects.toThrow(/unidad/i);
  });

  it("rechaza si el pedido ya está reembolsado", async () => {
    order.status = "REFUNDED";
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    await expect(performOnlineItemRefund(tx as never, P())).rejects.toThrow(/cancelad|reembolsad/i);
  });

  it("parcial con restock: repone talla, reduce línea y totales, mantiene estado", async () => {
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    const res = await performOnlineItemRefund(tx as never, P({ qty: 1, restock: true }));

    expect(res.status).toBe("PAID");
    expect(res.refundedAmount).toBe(19.99);
    expect(res.stockRestored).toBe(true);
    expect(res.fullyRefunded).toBe(false);
    expect(sizeIncrements).toEqual([{ productId: "p1", size: "M", qty: 1 }]);
    expect(items[0]!.quantity).toBe(1);
    expect(order.total).toBe(19.99);
    expect(round2(order.subtotal + order.tax)).toBe(order.total);
    const meta = order.metadata as Record<string, unknown>;
    const returns = meta.returns as Record<string, unknown>[];
    expect(returns).toHaveLength(1);
    expect(returns[0]).toMatchObject({ stripeRefundId: "re_1", channel: "online", restocked: true });
    expect(meta.stockRestored).toBeUndefined();
  });

  it("parcial SIN restock: no toca stock, pero reduce totales y registra", async () => {
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    const res = await performOnlineItemRefund(tx as never, P({ qty: 1, restock: false }));

    expect(res.stockRestored).toBe(false);
    expect(sizeIncrements).toEqual([]);
    expect(productIncrements).toEqual([]);
    expect(recompute).not.toHaveBeenCalled();
    expect(order.total).toBe(19.99);
    const returns = (order.metadata as Record<string, unknown>).returns as Record<string, unknown>[];
    expect(returns[0]).toMatchObject({ restocked: false });
  });

  it("última unidad: deja el pedido REFUNDED, totales a 0 y stockRestored si restock", async () => {
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    const res = await performOnlineItemRefund(tx as never, P({ qty: 2, restock: true }));

    expect(res.status).toBe("REFUNDED");
    expect(res.fullyRefunded).toBe(true);
    expect(res.refundedAmount).toBe(39.98);
    expect(order.total).toBe(0);
    expect(order.subtotal).toBe(0);
    expect(order.tax).toBe(0);
    expect((order.metadata as Record<string, unknown>).stockRestored).toBe(true);
  });

  it("idempotencia: repetir el mismo stripeRefundId no aplica de nuevo", async () => {
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    await performOnlineItemRefund(tx as never, P({ qty: 1, stripeRefundId: "re_dup" }));
    const totalTrasPrimero = order.total;
    sizeIncrements.length = 0;

    const res2 = await performOnlineItemRefund(tx as never, P({ qty: 1, stripeRefundId: "re_dup" }));
    expect(res2.alreadyApplied).toBe(true);
    expect(res2.refundedAmount).toBe(0);
    expect(order.total).toBe(totalTrasPrimero); // sin doble descuento
    expect(sizeIncrements).toEqual([]); // sin doble reposición
  });

  it("producto sin talla repone Product.stock", async () => {
    items = [{ id: "i1", productId: "p9", productName: "Balón", variantSize: null, quantity: 1, subtotal: 20 }];
    order.total = 20;
    order.subtotal = 16.53;
    order.tax = 3.47;
    const { performOnlineItemRefund } = await import("@/lib/pos/refund-online");
    await performOnlineItemRefund(tx as never, P({ qty: 1, restock: true }));
    expect(productIncrements).toEqual([{ productId: "p9", qty: 1 }]);
    expect(sizeIncrements).toEqual([]);
  });
});
