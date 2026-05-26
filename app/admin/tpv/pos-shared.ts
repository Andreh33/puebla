/**
 * Tipos y cálculos compartidos del TPV de tienda (/admin/tpv).
 *
 * Este módulo NO lleva "use server" ni "use client": solo tipos puros y
 * helpers deterministas reutilizados por el componente cliente (PosTerminal,
 * ProductCatalog, TicketPanel) y por las server actions (tpv-actions).
 */

export type ProductFamily = "calzado" | "textil" | "accesorio";

/** Ficha de producto tal y como la consume el grid del TPV. */
export type PosCatalogItem = {
  id: string;
  name: string;
  baseSku: string;
  family: ProductFamily;
  mainImageUrl: string | null;
  /** Precio de venta efectivo (salePrice si está en oferta, si no retailPrice). */
  unitPrice: number;
  retailPrice: number;
  salePrice: number | null;
  onSale: boolean;
  productStock: number;
  isFeatured: boolean;
  brandName: string;
  categoryName: string | null;
  tags: string[];
  sizes: Array<{ size: string; stock: number }>;
};

/** Parámetros de búsqueda/filtrado del catálogo (server action searchPosCatalog). */
export type PosCatalogParams = {
  q?: string;
  inStock?: boolean;
  featured?: boolean;
  onSale?: boolean;
  categorySlug?: string | null;
  brandSlug?: string | null;
  tag?: string | null;
  take?: number;
};

/** Listas para los chips de filtro del TPV. */
export type PosFilters = {
  brands: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
  tags: string[];
};

export type PaymentMethod = "efectivo" | "tarjeta" | "bizum";

/** Una línea del ticket (carrito). */
export type CartLine = {
  key: string;
  productId: string;
  name: string;
  baseSku: string;
  mainImageUrl: string | null;
  family: ProductFamily;
  size: string | null;
  sizes: Array<{ size: string; stock: number }>;
  productStock: number;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
};

export type CartMeta = { key: string; value: string };

/** Un ticket completo (carrito). El TPV maneja varios a la vez (pestañas). */
export type Cart = {
  id: string;
  lines: CartLine[];
  customerName: string;
  customerPhone: string;
  payment: PaymentMethod;
  totalDiscount: number;
  note: string;
  meta: CartMeta[];
  createdAt: number;
};

export const IVA_RATE = 0.21;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Subtotal de una línea (precio·uds − dto. de línea), nunca negativo. */
export function lineSubtotal(l: CartLine): number {
  return Math.max(0, round2(l.unitPrice * l.quantity - l.lineDiscount));
}

/**
 * Totales del ticket con IVA incluido en los precios (igual criterio que
 * lib/pos/totals.planTotals, que es el que manda en el servidor).
 */
export function cartTotals(cart: Cart): {
  gross: number;
  base: number;
  tax: number;
  total: number;
  units: number;
} {
  const gross = cart.lines.reduce((a, l) => a + lineSubtotal(l), 0);
  const total = Math.max(0, round2(gross - cart.totalDiscount));
  const base = round2(total / (1 + IVA_RATE));
  const tax = round2(total - base);
  const units = cart.lines.reduce((a, l) => a + l.quantity, 0);
  return { gross, base, tax, total, units };
}

export function emptyCart(id: string): Cart {
  return {
    id,
    lines: [],
    customerName: "",
    customerPhone: "",
    payment: "efectivo",
    totalDiscount: 0,
    note: "",
    meta: [],
    createdAt: Date.now(),
  };
}

/** Stock disponible para una talla concreta (o el stock de producto si no hay tallas). */
export function stockFor(item: PosCatalogItem, size: string | null): number {
  if (size) return item.sizes.find((s) => s.size === size)?.stock ?? 0;
  return item.productStock;
}
