import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * Tests del restablecimiento de stock en refund/cancel (lib/stripe/orders.ts).
 *
 * Mockeamos @/lib/db con un stub con estado: un único Order en memoria cuyo
 * metadata.stockRestored se actualiza al restaurar, para PROBAR la idempotencia
 * (dos charge.refunded seguidos no incrementan el stock dos veces).
 * recomputeProductStock se mockea (su lógica se prueba aparte).
 */

// --- Estado en memoria del Order bajo prueba ---
type Item = { productId: string | null; variantSize: string | null; quantity: number };
type OrderRow = {
  id: string;
  status: string;
  stripePaymentIntentId: string;
  metadata: Record<string, unknown> | null;
  items: Item[];
};

let order: OrderRow;

// Contadores de efectos sobre stock para las aserciones.
const sizeIncrements: Array<{ productId: string; size: string; qty: number }> = [];
const productIncrements: Array<{ productId: string; qty: number }> = [];
const recompute = vi.fn(async () => ({ total: 0, hidden: false }));

const orderFindUnique = vi.fn(async (args: { where: Record<string, unknown> }) => {
  // findUnique se usa con where.stripePaymentIntentId (markOrderRefunded) y con
  // where.id (restoreStockForOrder). En ambos casos devolvemos el mismo order.
  void args;
  return order;
});
const orderUpdate = vi.fn(async (args: { data: Record<string, unknown> }) => {
  if (typeof args.data.status === "string") order.status = args.data.status as string;
  if (args.data.metadata !== undefined) {
    order.metadata = args.data.metadata as Record<string, unknown>;
  }
  return order;
});
const productSizeUpdateMany = vi.fn(
  async (args: { where: { productId: string; size: string }; data: { stock: { increment: number } } }) => {
    sizeIncrements.push({
      productId: args.where.productId,
      size: args.where.size,
      qty: args.data.stock.increment,
    });
    return { count: 1 };
  },
);
const productUpdateMany = vi.fn(
  async (args: { where: { id: string }; data: { stock: { increment: number } } }) => {
    productIncrements.push({ productId: args.where.id, qty: args.data.stock.increment });
    return { count: 1 };
  },
);

const dbMock = {
  order: { findUnique: orderFindUnique, update: orderUpdate },
  productSize: { updateMany: productSizeUpdateMany },
  product: { updateMany: productUpdateMany },
  // $transaction(cb) ejecuta el callback pasándole el propio db como tx.
  $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(dbMock)),
};

vi.mock("@/lib/db", () => ({ db: dbMock, Prisma: { PrismaClientKnownRequestError: class {} } }));
vi.mock("@/lib/products/stock", () => ({
  recomputeProductStock: (...a: unknown[]) => recompute(...(a as [])),
}));
// getStripe no se usa en markOrderRefunded, pero el módulo lo importa.
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => null }));

/** Charge de reembolso TOTAL por defecto (amount === amount_refunded). Para un
 *  reembolso PARCIAL, pasa `amountRefunded < amount`. */
function chargeFor(intentId: string, amount = 1000, amountRefunded = 1000): Stripe.Charge {
  return { payment_intent: intentId, amount, amount_refunded: amountRefunded } as unknown as Stripe.Charge;
}

beforeEach(() => {
  vi.clearAllMocks();
  sizeIncrements.length = 0;
  productIncrements.length = 0;
  order = {
    id: "o1",
    status: "PAID",
    stripePaymentIntentId: "pi_123",
    metadata: { source: "zonasport-web" },
    items: [
      { productId: "p1", variantSize: "40", quantity: 2 },
      { productId: "p2", variantSize: null, quantity: 1 },
      // Línea libre de un ticket mixto: no tiene inventario que restaurar.
      { productId: null, variantSize: null, quantity: 1 },
    ],
  };
});

describe("markOrderRefunded — restaura stock", () => {
  it("restaura por talla y por producto, marca REFUNDED y stockRestored", async () => {
    const { markOrderRefunded } = await import("@/lib/stripe/orders");
    const res = await markOrderRefunded(chargeFor("pi_123"));

    expect(res?.status).toBe("REFUNDED");
    expect(sizeIncrements).toEqual([{ productId: "p1", size: "40", qty: 2 }]);
    expect(productIncrements).toEqual([{ productId: "p2", qty: 1 }]);
    expect(recompute).toHaveBeenCalledTimes(2); // p1 y p2
    expect(order.metadata?.stockRestored).toBe(true);
  });

  it("idempotente: una 2ª llamada no vuelve a incrementar el stock", async () => {
    const { markOrderRefunded } = await import("@/lib/stripe/orders");
    await markOrderRefunded(chargeFor("pi_123"));
    // Reset de contadores tras la 1ª restauración (el order ya quedó REFUNDED).
    sizeIncrements.length = 0;
    productIncrements.length = 0;
    recompute.mockClear();

    // 2ª llamada: status ya REFUNDED → early return, sin tocar stock.
    const res2 = await markOrderRefunded(chargeFor("pi_123"));
    expect(res2?.status).toBe("REFUNDED");
    expect(sizeIncrements).toEqual([]);
    expect(productIncrements).toEqual([]);
    expect(recompute).not.toHaveBeenCalled();
  });

  it("si el pedido estaba PENDING (sin descuento), NO restaura stock", async () => {
    order.status = "PENDING";
    const { markOrderRefunded } = await import("@/lib/stripe/orders");
    const res = await markOrderRefunded(chargeFor("pi_123"));
    expect(res?.status).toBe("REFUNDED");
    expect(sizeIncrements).toEqual([]);
    expect(productIncrements).toEqual([]);
  });

  it("guard interno: aunque se entre 2 veces a restoreStock, el flag corta", async () => {
    // Simula que el metadata ya trae stockRestored (p.ej. restaurado por cancel).
    order.metadata = { stockRestored: true };
    order.status = "PROCESSING";
    const { markOrderRefunded } = await import("@/lib/stripe/orders");
    await markOrderRefunded(chargeFor("pi_123"));
    // restoreStockForOrder entra pero el flag corta antes de incrementar.
    expect(sizeIncrements).toEqual([]);
    expect(productIncrements).toEqual([]);
  });

  it("reembolso PARCIAL (amount_refunded < amount): NO toca estado ni stock", async () => {
    const { markOrderRefunded } = await import("@/lib/stripe/orders");
    // 1500 cobrado, solo 500 reembolsado → parcial: lo contabiliza la action.
    const res = await markOrderRefunded(chargeFor("pi_123", 1500, 500));
    expect(res?.status).toBe("PAID"); // sin cambiar
    expect(sizeIncrements).toEqual([]);
    expect(productIncrements).toEqual([]);
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
