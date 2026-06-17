import "server-only";
import { db, type Prisma } from "@/lib/db";
import { buildVariantSku, productFamily, skuOrFallback } from "@/lib/pos/sku";
import { planTotals, round2 } from "@/lib/pos/totals";
import { recomputeProductStock } from "@/lib/products/stock";

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
  /** Coste del producto (fallback si la talla no trae el suyo). null si no hay. */
  costPrice?: number | null;
  sizes: Array<{ size: string; stock: number; costPrice?: number | null }>;
};

export type PlannedItem = {
  productId: string;
  productName: string;
  productSku: string;
  variantSize: string | null;
  unitPrice: number;
  /** Coste unitario congelado (margen histórico). null si el producto no tiene. */
  unitCost: number | null;
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
  // Demanda ACUMULADA por (productId, talla|‹sin talla›). Si el mismo artículo
  // aparece en varias líneas del carrito, validamos contra la SUMA, no contra
  // cada línea por separado — evita el oversell (stock negativo).
  const consumed = new Map<string, number>();

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) throw new Error(`Producto no encontrado: ${line.productId}`);
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error(`Cantidad inválida para "${p.name}".`);
    }
    if (line.unitPrice < 0) throw new Error(`Precio inválido para "${p.name}".`);

    const key = `${p.id}::${line.size ?? ""}`;
    const wanted = (consumed.get(key) ?? 0) + line.quantity;
    if (line.size) {
      const ps = p.sizes.find((s) => s.size === line.size);
      if (!ps) throw new Error(`La talla ${line.size} no existe en "${p.name}".`);
      if (ps.stock < wanted) {
        throw new Error(`Sin stock suficiente de "${p.name}" talla ${line.size} (hay ${ps.stock}).`);
      }
    } else if (p.productStock < wanted) {
      throw new Error(`Sin stock suficiente de "${p.name}" (hay ${p.productStock}).`);
    }
    consumed.set(key, wanted);

    const family = productFamily(p.primaryCategorySlug);
    const baseSku = skuOrFallback(p);
    const subtotal = Math.max(0, round2(line.unitPrice * line.quantity - (line.lineDiscount ?? 0)));
    // Coste unitario: el de la talla si lo trae, si no el del producto.
    const sizeCost = line.size
      ? p.sizes.find((s) => s.size === line.size)?.costPrice
      : undefined;
    const unitCost = sizeCost ?? p.costPrice ?? null;
    items.push({
      productId: p.id,
      productName: p.name,
      productSku: buildVariantSku({ baseSku, size: line.size, family }),
      variantSize: line.size,
      unitPrice: round2(line.unitPrice),
      unitCost: unitCost != null ? round2(unitCost) : null,
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
  /** Nota libre del pedido (se guarda en metadata, sale en el ticket). */
  note?: string;
  /** Pares clave/valor (meta del pedido): vendedor, origen, referencia… */
  meta?: Array<{ key: string; value: string }>;
};

export type CreatedSale = {
  orderId: string;
  ticketNumber: string;
  totals: { subtotal: number; tax: number; total: number };
};

/**
 * Nº de ticket legible (no fiscal): ZS-AAAAMMDD-#### (count del día + 1).
 * Nota: no es una secuencia fiscal certificada y no hay constraint único; bajo
 * concurrencia alta dos ventas del mismo día podrían repetir número. Aceptable
 * para una caja física (baja concurrencia); revisar si se exige numeración fiscal.
 */
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
        stock: true, taxRate: true, costPrice: true,
        primaryCategory: { select: { slug: true } },
        sizes: { select: { size: true, stock: true, costPrice: true } },
      },
    });
    const products: PosProduct[] = rows.map((r) => ({
      id: r.id, name: r.name, sku: r.sku, modelCode: r.modelCode, externalId: r.externalId,
      primaryCategorySlug: r.primaryCategory?.slug ?? null,
      taxRate: Number(r.taxRate), productStock: r.stock,
      costPrice: r.costPrice != null ? Number(r.costPrice) : null,
      sizes: r.sizes.map((s) => ({
        size: s.size, stock: s.stock,
        costPrice: s.costPrice != null ? Number(s.costPrice) : null,
      })),
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

    // Sincroniza Product.stock (suma de tallas) y aplica la regla sellout→DRAFT
    // también en la caja física: si una venta agota el producto, sale de la web.
    for (const productId of productIds) {
      await recomputeProductStock(tx, productId);
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
        metadata: {
          channel: "pos",
          paymentMethod: input.paymentMethod,
          ticketNumber,
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
          ...(input.meta && input.meta.length
            ? { meta: input.meta.filter((m) => m.key.trim() || m.value.trim()) }
            : {}),
        } as Prisma.InputJsonValue,
        items: {
          create: planned.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            productSku: it.productSku,
            variantSize: it.variantSize,
            unitPrice: it.unitPrice.toFixed(2),
            unitCost: it.unitCost != null ? it.unitCost.toFixed(2) : null,
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
