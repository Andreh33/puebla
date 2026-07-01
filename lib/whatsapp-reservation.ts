/**
 * Registro (cliente) de una reserva por WhatsApp. Se llama en el onClick del
 * botón "Reservar por WhatsApp"; usa `keepalive` para que la petición sobreviva
 * a la navegación inmediata a wa.me. No bloquea ni interrumpe la reserva.
 */
export type ReservationPayload = {
  kind: "product" | "cart";
  productName?: string | null;
  sku?: string | null;
  size?: string | null;
  itemsCount?: number | null;
  amount?: number | null;
  summary: string;
};

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
