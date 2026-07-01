/**
 * Carrito Phase-1 (sin Stripe) — store client-only sobre localStorage.
 *
 * Estado mínimo en memoria + persistencia en localStorage bajo `zs_cart_v1`.
 * Se notifica a los suscriptores en cada cambio (mismo tab) y se escucha el
 * evento `storage` del navegador para sincronizar entre pestañas.
 *
 * Cuando llegue Stripe (Phase 2) el shape de CartItem se mapea 1:1 con
 * CartIntent.items (productId, size, qty, precio congelado).
 */

export const CART_STORAGE_KEY = "zs_cart_v1";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  colorName: string;
  size: string | null;
  /** SKU/referencia del producto (para el mensaje de reserva por WhatsApp). */
  sku?: string;
  /** Precio unitario congelado al añadir (final, IVA incluido). */
  price: number;
  /**
   * Stock disponible de la talla en el momento de añadir. Permite capar la
   * cantidad en el carrito (botón "+") y avisar antes de llegar al checkout.
   * `undefined` en items antiguos / añadidos sin stock conocido → sin tope.
   */
  maxStock?: number;
  qty: number;
  addedAt: number;
};

/** Storage mínimo — permite inyectar mock en tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Listener = (items: CartItem[]) => void;

function safeStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sanitizeItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const v = raw as Record<string, unknown>;
      const productId = typeof v.productId === "string" ? v.productId : null;
      if (!productId) return null;
      const qty = typeof v.qty === "number" && v.qty > 0 ? Math.floor(v.qty) : 1;
      const price = typeof v.price === "number" && Number.isFinite(v.price) ? v.price : 0;
      const maxStock =
        typeof v.maxStock === "number" && v.maxStock > 0
          ? Math.floor(v.maxStock)
          : undefined;
      const sku = typeof v.sku === "string" ? v.sku : undefined;
      return {
        productId,
        slug: typeof v.slug === "string" ? v.slug : productId,
        name: typeof v.name === "string" ? v.name : "Producto",
        brand: typeof v.brand === "string" ? v.brand : "",
        imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : null,
        colorName: typeof v.colorName === "string" ? v.colorName : "Único",
        size: typeof v.size === "string" ? v.size : null,
        price,
        qty: maxStock ? Math.min(qty, maxStock) : qty,
        addedAt: typeof v.addedAt === "number" ? v.addedAt : Date.now(),
        // Solo incluimos las claves opcionales si las conocemos: así el tipo
        // inferido las deja opcionales (igual que en CartItem) y el type-guard
        // de abajo encaja.
        ...(maxStock !== undefined ? { maxStock } : {}),
        ...(sku !== undefined ? { sku } : {}),
      } satisfies CartItem;
    })
    .filter((x): x is CartItem => x !== null);
}

/** Lee y parsea el carrito desde un storage dado. */
export function readCart(storage?: StorageLike): CartItem[] {
  const s = storage ?? safeStorage();
  if (!s) return [];
  const raw = s.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    return sanitizeItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Escribe el carrito al storage dado. */
export function writeCart(items: CartItem[], storage?: StorageLike): void {
  const s = storage ?? safeStorage();
  if (!s) return;
  try {
    s.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota / safari private mode → silenciamos
  }
}

/** Clave única de línea: productId + size (talla null permitido). */
export function itemKey(productId: string, size: string | null): string {
  return `${productId}::${size ?? ""}`;
}

// ---------------------------------------------------------------------------
// Operadores puros (testables sin storage)
// ---------------------------------------------------------------------------

export function addItemPure(items: CartItem[], next: CartItem): CartItem[] {
  const key = itemKey(next.productId, next.size);
  const existing = items.findIndex((i) => itemKey(i.productId, i.size) === key);
  if (existing >= 0) {
    const updated = [...items];
    const prev = updated[existing]!;
    // Stock vivo: usamos el del último añadido si viene, si no el previo.
    const maxStock = next.maxStock ?? prev.maxStock;
    const mergedQty = prev.qty + next.qty;
    updated[existing] = {
      ...prev,
      // Nunca dejamos pasar más unidades de las que hay en stock de la talla.
      qty: maxStock ? Math.min(mergedQty, maxStock) : mergedQty,
      maxStock,
      // refrescamos info "viva" por si cambió precio/imagen entre añadidos
      price: next.price,
      imageUrl: next.imageUrl ?? prev.imageUrl,
      name: next.name || prev.name,
      brand: next.brand || prev.brand,
      colorName: next.colorName || prev.colorName,
      slug: next.slug || prev.slug,
    };
    return updated;
  }
  return [...items, next];
}

export function removeItemPure(
  items: CartItem[],
  productId: string,
  size: string | null,
): CartItem[] {
  const key = itemKey(productId, size);
  return items.filter((i) => itemKey(i.productId, i.size) !== key);
}

export function updateQtyPure(
  items: CartItem[],
  productId: string,
  size: string | null,
  qty: number,
): CartItem[] {
  const key = itemKey(productId, size);
  const safeQty = Math.max(0, Math.floor(qty));
  if (safeQty === 0) {
    return items.filter((i) => itemKey(i.productId, i.size) !== key);
  }
  return items.map((i) => {
    if (itemKey(i.productId, i.size) !== key) return i;
    // Respetamos el tope de stock de la talla si lo conocemos.
    const capped = i.maxStock ? Math.min(safeQty, i.maxStock) : safeQty;
    return { ...i, qty: capped };
  });
}

export function totalItemsPure(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.qty, 0);
}

export function totalPricePure(items: CartItem[]): number {
  const cents = items.reduce(
    (acc, i) => acc + Math.round(i.price * 100) * i.qty,
    0,
  );
  return cents / 100;
}

// ---------------------------------------------------------------------------
// API impura (con storage + suscriptores)
// ---------------------------------------------------------------------------

const listeners = new Set<Listener>();
let crossTabBound = false;

function notify(items: CartItem[]) {
  for (const cb of listeners) {
    try {
      cb(items);
    } catch {
      // no propagamos errores de un suscriptor a los demás
    }
  }
}

function bindCrossTab() {
  if (crossTabBound) return;
  if (typeof window === "undefined") return;
  window.addEventListener("storage", (e) => {
    if (e.key !== CART_STORAGE_KEY) return;
    notify(readCart());
  });
  crossTabBound = true;
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addItem(item: CartItem): CartItem[] {
  const next = addItemPure(readCart(), item);
  writeCart(next);
  notify(next);
  return next;
}

export function removeItem(productId: string, size: string | null): CartItem[] {
  const next = removeItemPure(readCart(), productId, size);
  writeCart(next);
  notify(next);
  return next;
}

export function updateQty(
  productId: string,
  size: string | null,
  qty: number,
): CartItem[] {
  const next = updateQtyPure(readCart(), productId, size, qty);
  writeCart(next);
  notify(next);
  return next;
}

export function clear(): CartItem[] {
  writeCart([]);
  notify([]);
  return [];
}

/**
 * Suscribe a cambios del carrito. Devuelve función de desuscripción.
 * Activa la escucha de `storage` para sincronización entre pestañas
 * la primera vez que se llama.
 */
export function subscribe(cb: Listener): () => void {
  bindCrossTab();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
