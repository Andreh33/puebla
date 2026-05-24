import "server-only";
import { db, type Prisma } from "@/lib/db";
import { buildVariantSku, productFamily, skuOrFallback } from "@/lib/pos/sku";
import { planTotals, round2 } from "@/lib/pos/totals";

export type PosLineInput = {
  productId: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
};

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  modelCode: string | null;
  externalId: string | null;
  primaryCategorySlug: string | null;
  taxRate: number;
  productStock: number;
  sizes: Array<{ size: string; stock: number }>;
};

export type PlannedItem = {
  productId: string;
  productName: string;
  productSku: string;
  variantSize: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type StockDelta = { productId: string; size: string | null; quantity: number };

export type PlannedSale = {
  items: PlannedItem[];
  stockDeltas: StockDelta[];
  totals: { subtotal: number; tax: number; total: number };
};

/** Valida stock y compone líneas/totales/deltas. Lanza Error con mensaje claro. */
export function planSale(
  lines: PosLineInput[],
  products: PosProduct[],
  totalDiscount = 0,
): PlannedSale {
  if (!lines.length) throw new Error("El carrito está vacío.");
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: PlannedItem[] = [];
  const stockDeltas: StockDelta[] = [];

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) throw new Error(`Producto no encontrado: ${line.productId}`);
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error(`Cantidad inválida para "${p.name}".`);
    }
    if (line.unitPrice < 0) throw new Error(`Precio inválido para "${p.name}".`);

    if (line.size) {
      const ps = p.sizes.find((s) => s.size === line.size);
      if (!ps) throw new Error(`La talla ${line.size} no existe en "${p.name}".`);
      if (ps.stock < line.quantity) {
        throw new Error(`Sin stock suficiente de "${p.name}" talla ${line.size} (hay ${ps.stock}).`);
      }
    } else if (p.productStock < line.quantity) {
      throw new Error(`Sin stock suficiente de "${p.name}" (hay ${p.productStock}).`);
    }

    const family = productFamily(p.primaryCategorySlug);
    const baseSku = skuOrFallback(p);
    const subtotal = Math.max(0, round2(line.unitPrice * line.quantity - (line.lineDiscount ?? 0)));
    items.push({
      productId: p.id,
      productName: p.name,
      productSku: buildVariantSku({ baseSku, size: line.size, family }),
      variantSize: line.size,
      unitPrice: round2(line.unitPrice),
      quantity: line.quantity,
      subtotal,
    });
    stockDeltas.push({ productId: p.id, size: line.size, quantity: line.quantity });
  }

  const totals = planTotals({ lineSubtotals: items.map((i) => i.subtotal), totalDiscount });
  return { items, stockDeltas, totals };
}

export type PaymentMethod = "efectivo" | "tarjeta" | "bizum";

export type CreateSaleInput = {
  lines: PosLineInput[];
  paymentMethod: PaymentMethod;
  totalDiscount?: number;
  customer?: { name?: string; phone?: string };
};

export type CreatedSale = {
  orderId: string;
  ticketNumber: string;
  totals: { subtotal: number; tax: number; total: number };
};

/** Nº de ticket legible (no fiscal): ZS-AAAAMMDD-#### (count del día + 1). */
async function nextTicketNumber(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dayStart = new Date(y, now.getMonth(), now.getDate());
  const dayEnd = new Date(y, now.getMonth(), now.getDate() + 1);
  const count = await tx.order.count({
    where: { createdAt: { gte: dayStart, lt: dayEnd }, deliveryMethod: "in_store" },
  });
  return `ZS-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
}

/** Registra la venta en tienda: descuenta stock + crea Order/OrderItem. No toca status. */
export async function createInStoreSale(
  input: CreateSaleInput,
  userId?: string,
): Promise<CreatedSale> {
  const productIds = [...new Set(input.lines.map((l) => l.productId))];

  return db.$transaction(async (tx) => {
    const rows = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, sku: true, modelCode: true, externalId: true,
        stock: true, taxRate: true,
        primaryCategory: { select: { slug: true } },
        sizes: { select: { size: true, stock: true } },
      },
    });
    const products: PosProduct[] = rows.map((r) => ({
      id: r.id, name: r.name, sku: r.sku, modelCode: r.modelCode, externalId: r.externalId,
      primaryCategorySlug: r.primaryCategory?.slug ?? null,
      taxRate: Number(r.taxRate), productStock: r.stock, sizes: r.sizes,
    }));

    const planned = planSale(input.lines, products, input.totalDiscount ?? 0);

    for (const delta of planned.stockDeltas) {
      if (delta.size) {
        await tx.productSize.updateMany({
          where: { productId: delta.productId, size: delta.size },
          data: { stock: { decrement: delta.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: delta.productId },
          data: { stock: { decrement: delta.quantity } },
        });
      }
    }

    const ticketNumber = await nextTicketNumber(tx);

    const order = await tx.order.create({
      data: {
        customerName: input.customer?.name || null,
        customerPhone: input.customer?.phone || null,
        subtotal: planned.totals.subtotal.toFixed(2),
        shippingCost: "0",
        tax: planned.totals.tax.toFixed(2),
        total: planned.totals.total.toFixed(2),
        currency: "EUR",
        status: "PAID",
        paymentStatus: input.paymentMethod,
        deliveryMethod: "in_store",
        metadata: { channel: "pos", paymentMethod: input.paymentMethod, ticketNumber } as Prisma.InputJsonValue,
        items: {
          create: planned.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            productSku: it.productSku,
            variantSize: it.variantSize,
            unitPrice: it.unitPrice.toFixed(2),
            quantity: it.quantity,
            subtotal: it.subtotal.toFixed(2),
          })),
        },
      },
      select: { id: true },
    });

    await tx.productAudit.createMany({
      data: productIds.map((productId) => ({ productId, userId, action: "pos_sale" })),
    });

    return { orderId: order.id, ticketNumber, totals: planned.totals };
  });
}
