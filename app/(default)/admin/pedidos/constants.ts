/**
 * Constantes compartidas del panel de pedidos.
 *
 * Viven aquí —y NO en `_actions.ts`— porque `_actions.ts` es un módulo
 * `"use server"`, donde SOLO se pueden exportar funciones async (server
 * actions). Exportar un `const`/array desde un fichero "use server" corrompe
 * el manifest de server actions y hace que TODAS las acciones del módulo
 * fallen con 500 al invocarse (Ver detalle, Exportar CSV, cambiar estado…).
 */

/**
 * Estados de FULFILLMENT que el admin puede asignar a mano. PAID lo crea el
 * webhook al cobrar; REFUNDED lo gestiona Stripe (charge.refunded) para
 * mantener la verdad del dinero en Stripe. Desde el panel solo se avanza o
 * cancela el envío.
 */
export const FULFILLMENT_STATUSES = [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
