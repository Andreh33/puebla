/**
 * Registro (cliente) de una reserva por WhatsApp. Se llama en el onClick del
 * botón "Reservar por WhatsApp"; usa `keepalive` para que la petición sobreviva
 * a la navegación inmediata a wa.me. No bloquea ni interrumpe la reserva.
 */
export type ReservationItemPayload = {
  productId: string;
  quantity: number;
};

export type ReservationPayload = {
  kind: "product" | "cart";
  productName?: string | null;
  sku?: string | null;
  size?: string | null;
  itemsCount?: number | null;
  amount?: number | null;
  summary: string;
  /** Referencias estructuradas para generar avisos de marketplace en servidor. */
  items?: ReservationItemPayload[];
};

/**
 * Reduce el payload público a referencias de catálogo válidas y acotadas. El
 * servidor vuelve a consultar los productos: el cliente nunca decide si un
 * artículo pertenece a Amazon o Miravia.
 */
export function sanitizeReservationItems(value: unknown): ReservationItemPayload[] {
  if (!Array.isArray(value)) return [];

  const items: ReservationItemPayload[] = [];
  for (const raw of value.slice(0, 50)) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Record<string, unknown>;
    const productId = typeof candidate.productId === "string" ? candidate.productId.trim() : "";
    const quantity = candidate.quantity;
    if (
      !productId ||
      productId.length > 64 ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      continue;
    }
    items.push({ productId, quantity });
  }
  return items;
}

export function logReservation(p: ReservationPayload): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, sourcePage: window.location.href }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* nunca romper la reserva del cliente */
  }
}
