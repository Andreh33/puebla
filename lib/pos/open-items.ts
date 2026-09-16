export const POS_OPEN_ITEMS = {
  invoice: { sku: "1111", label: "Factura" },
  store_product: { sku: "2222", label: "Producto en tienda" },
} as const;

export type PosOpenItemKind = keyof typeof POS_OPEN_ITEMS;
export type InvoiceProfitMode = "percentage" | "amount";

export type PosOpenItemDefinition = {
  kind: PosOpenItemKind;
  sku: string;
  label: string;
};

export function isPosOpenItemKind(value: unknown): value is PosOpenItemKind {
  return value === "invoice" || value === "store_product";
}

export function getPosOpenItem(kind: PosOpenItemKind): PosOpenItemDefinition {
  return { kind, ...POS_OPEN_ITEMS[kind] };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Convierte la ganancia indicada para el SKU 1111 en un coste unitario. */
export function calculateInvoiceMargin(
  unitPrice: number,
  mode: InvoiceProfitMode,
  value: number,
): { profitAmount: number; unitCost: number } | null {
  if (!Number.isFinite(unitPrice) || unitPrice < 0.01 || !Number.isFinite(value) || value < 0) {
    return null;
  }
  if (mode === "percentage" && value > 100) return null;

  const profitAmount = roundCurrency(mode === "percentage" ? unitPrice * (value / 100) : value);
  const roundedPrice = roundCurrency(unitPrice);
  if (profitAmount > roundedPrice) return null;

  return {
    profitAmount,
    unitCost: roundCurrency(roundedPrice - profitAmount),
  };
}

/** Solo una búsqueda exacta habilita los artículos libres del TPV. */
export function getPosOpenItemBySku(value: string): PosOpenItemDefinition | null {
  const sku = value.trim();
  if (sku === POS_OPEN_ITEMS.invoice.sku) return getPosOpenItem("invoice");
  if (sku === POS_OPEN_ITEMS.store_product.sku) return getPosOpenItem("store_product");
  return null;
}

export function readPosOpenItemKind(metadata: unknown): PosOpenItemKind | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const kind = (metadata as Record<string, unknown>).posOpenItemKind;
  return isPosOpenItemKind(kind) ? kind : null;
}

export function readPosOpenItemDescription(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const description = (metadata as Record<string, unknown>).description;
  return typeof description === "string" && description.trim() ? description.trim() : null;
}
