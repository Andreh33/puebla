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
