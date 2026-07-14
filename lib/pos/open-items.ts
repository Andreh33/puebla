export const POS_OPEN_ITEMS = {
  invoice: { sku: "1111", label: "Factura" },
  store_product: { sku: "2222", label: "Producto en tienda" },
} as const;

export type PosOpenItemKind = keyof typeof POS_OPEN_ITEMS;

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
